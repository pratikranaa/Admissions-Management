import os
import re
import io
import pytesseract
from pdf2image import convert_from_path
import fitz  # PyMuPDF
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
from PIL import Image
import concurrent.futures
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '')))
from llm_verify_module import verify_marks_llama

# Load the Qwen2 model and processor
print("Loading Qwen2 model and processor")
model = Qwen2VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2-VL-7B-Instruct", torch_dtype="auto", device_map="auto"
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-7B-Instruct")
print("Model and processor loaded")

def pdf_to_png(pdf_path, page_num):
    print(f"Converting PDF to PNG: {pdf_path}, page {page_num}")
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num)
    pix = page.get_pixmap()
    img = Image.open(io.BytesIO(pix.tobytes()))
    img_path = f"page_{page_num+1}.png"
    img.save(img_path)
    doc.close()
    print(f"Saved PNG image: {img_path}")
    return img_path

def process_image_with_qwen2(image_path):
    print(f"Processing image with Qwen2: {image_path}")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image_path},
                {"type": "text", "text": "Extract the text of this image in markdown format."},
            ],
        }
    ]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    )
    
    inputs = inputs.to("cuda")
    generated_ids = model.generate(**inputs, max_new_tokens=7500)
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)
    print(f"Extracted text: {output_text}")
    return output_text

def markdown_to_plaintext(markdown_text):
    print(f"Converting markdown to plaintext")
    if isinstance(markdown_text, list):
        markdown_text = ''.join(markdown_text)
    
    try:
        plaintext = re.sub(r'#\s*(.*)', r'\1', markdown_text)
        plaintext = re.sub(r'\*{1,2}(.+?)\*{1,2}', r'\1', plaintext)
        plaintext = re.sub(r'`([^`]*)`', r'\1', plaintext)
        plaintext = re.sub(r'!\[([^\]]+)\]\([^\)]+\)', '', plaintext)
        plaintext = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', plaintext)
        plaintext = plaintext.replace('\n', ' ')
        plaintext = re.sub(r'\s{2,}', ' ', plaintext)
        print(f"Converted plaintext: {plaintext}")
        return plaintext.strip()

    except re.error as e:
        print(f"Regex error during markdown conversion: {e}")
        return markdown_text

def find_class_page(pdf_path, search_text="Class 9th"):
    print(f"Finding class page in PDF: {pdf_path}")
    images = convert_from_path(pdf_path)
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img)
        if search_text.lower() in text.lower():
            print(f"Found class page: {i}")
            return i  # Return the page number (0-indexed)
    print("Class page not found")
    return None  # Return None if the text is not found

def process_candidate(candidate, transcript_path, form_path, output_folder):
    print(f"Processing candidate: {candidate}")
    yield f"Processing candidate: {candidate}"
    
    # Ensure the output directory exists
    output_path = os.path.join(output_folder, f"{candidate}.txt")

    # Process transcript PDF
    yield f"{candidate}: Extracting transcript data"
    doc = fitz.open(transcript_path)
    total_pages = doc.page_count
    print(f"Total pages in transcript: {total_pages}")
    transcript_data = []

    for i in range(total_pages):
        yield f"{candidate}: Processing transcript page {i+1}/{total_pages}"
        page_img_path = pdf_to_png(transcript_path, i)
        extracted_text = process_image_with_qwen2(page_img_path)
        plain_text = markdown_to_plaintext(extracted_text)
        transcript_data.append(f"Page {i+1}:\n{plain_text}\n\n")

    # Process form PDF
    yield f"{candidate}: Processing form data"
    form_doc = fitz.open(form_path)
    form_total_pages = form_doc.page_count
    print(f"Total pages in form: {form_total_pages}")
    class_page_num = find_class_page(form_path)
    form_text = ""
    if class_page_num is not None:
        for i in range(3):  # Process the identified class page and two subsequent pages
            if class_page_num + i < form_total_pages:
                form_page_img = pdf_to_png(form_path, class_page_num + i)
                form_page_text = markdown_to_plaintext(process_image_with_qwen2(form_page_img))
                form_text += f"Page {class_page_num + i + 1}:\n{form_page_text}\n\n"
            else:
                break

    with open(output_path, 'w') as f:
        f.write("# Marksheets -\n\n")
        for page in transcript_data:
            f.write(page)
        f.write("\n\n# Forms\n\n")
        f.write(form_text)

    yield f"{candidate}: OCR processing completed, starting verification"
    with open(output_path, 'r') as f:
        content = f.read()
    form_text, marksheet_text = content.split('# Marksheets -')
    verification_result = verify_marks_llama(form_text, marksheet_text)
    yield f"{candidate}: Verification result - {verification_result}"

    with open(output_path, 'a') as f:
        f.write(f"\n\nVerification Result: {verification_result}")

def process_candidate_pdfs(transcript_folder, forms_folder, output_folder):
    print("Starting processing of candidate files")
    transcript_files = {f[11:-4]: os.path.join(transcript_folder, f) for f in os.listdir(transcript_folder) if f.startswith('Transcript_') and f.endswith('.pdf')}
    forms_files = {f[6:-9]: os.path.join(forms_folder, f) for f in os.listdir(forms_folder) if f.startswith('Forms_') and f.endswith('_form.pdf')}

    yield "Starting processing of candidate files"

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_candidate = {executor.submit(process_candidate, candidate, transcript_files[candidate], forms_files[candidate], output_folder): candidate for candidate in transcript_files.keys() & forms_files.keys()}
        
        for future in concurrent.futures.as_completed(future_to_candidate):
            candidate = future_to_candidate[future]
            try:
                for message in future.result():
                    yield message
            except Exception as exc:
                yield f"{candidate} generated an exception: {exc}"
