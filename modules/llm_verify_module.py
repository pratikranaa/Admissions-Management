import os
import torch
import gc
import ollama  # Assuming ollama is the library you're using for Llama integration

def read_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return file.read().strip()
    except Exception as e:
        raise ValueError(f"Error reading from {file_path}: {e}")

def write_to_file(output_folder, file_name, result):
    try:
        os.makedirs(output_folder, exist_ok=True)  # Create output folder if it doesn't exist
        output_file_path = os.path.join(output_folder, file_name)
        with open(output_file_path, 'w') as file:
            file.write(result)
    except Exception as e:
        raise ValueError(f"Error writing to {output_file_path}: {e}")

def cleanup_gpu_memory():
    torch.cuda.empty_cache()
    torch.cuda.synchronize()
    gc.collect()

def verify_marks_llama(form_text, marksheet_text):
    prompt = f"""
    Here is the marksheet and admission form data for comparison:

    Marksheet:
    {marksheet_text}

    Admission Form:
    {form_text}

    Please compare the subject-wise marks for each class between marksheet data and the form data and return a binary outcome as 'Verified' or 'Not Verified'.
    Class 10 and Class 12 details are important so if the data is not available for them then return "Not Verified" directly. There are some conditions for class 12 scores stated below.
    For class 12:
        If both actual and predicted marks are provided in the form, compare only the actual marks with the  marksheet.
        If only predicted marks are available, skip Class 12 & check other classes scores.
    Based on the subject-wise comparison for all classes:
        If the marks for any subject in any class do not match, return 'Not Verified'.
        If the marks in both the admission form and marksheet match for every subject in all classes, return 'Verified'.
    Do not perform calculations, percentages, or provide any explanations. Return only 'Verified' or 'Not Verified' as your final output." 
   """

    with torch.no_grad():
        response = ollama.generate(
            model="marks-verification-model",  # Use your created model
            prompt=prompt
        )

    print("Full Response:", response)

    # Extract the response text
    if 'response' in response:
        result_text = response['response'].strip()  # Clean any leading/trailing whitespace
    else:
        raise ValueError("Unexpected response structure, 'response' key not found.")
    
    print("Result Text: -------------\n: ", result_text)
    # Check if the result contains "Not Verified" and return accordingly
    if "Not Verified" in result_text:
        return "Not Verified"
    else:
        return "Verified"


def process_files(input_folder_path, output_folder_path):
    try:
        for file_name in os.listdir(input_folder_path):
            if file_name.endswith('.txt'):
                file_path = os.path.join(input_folder_path, file_name)
                combined_text = read_from_file(file_path)
                marksheet_text, form_text = combined_text.split('# Forms')
                result = verify_marks_llama(form_text, marksheet_text)
                write_to_file(output_folder_path, file_name, result)
        print(f"Verification results have been saved in the {output_folder_path} folder.")
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        cleanup_gpu_memory()

