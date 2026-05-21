import os
import google.generativeai as genai
from dotenv import load_dotenv

# Try loading env files from workspace locations
load_dotenv("../../.env")
load_dotenv("../.env")
load_dotenv(".env")

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY environment variable is missing.")
    exit(1)

print(f"Key loaded: {api_key[:8]}...{api_key[-4:] if len(api_key) > 8 else ''}")

genai.configure(api_key=api_key)

print("\n--- Listing Models Supporting embedContent ---")
try:
    found = False
    for m in genai.list_models():
        if 'embedContent' in m.supported_generation_methods:
            print(f"Name: {m.name}")
            print(f"  Description: {m.description}")
            print(f"  Input limit: {m.input_token_limit}")
            found = True
    if not found:
         print("No models support embedContent.")
except Exception as e:
    print(f"Error querying Gemini API model list: {e}")
