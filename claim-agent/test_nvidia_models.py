from dotenv import load_dotenv
load_dotenv()

import os, time, json
from openai import OpenAI

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_API_KEY"],
)

TOOL = {
    "type": "function",
    "function": {
        "name": "extract_facts",
        "description": "Record flight disruption facts.",
        "parameters": {
            "type": "object",
            "properties": {
                "claim_type": {"type": "string"},
                "origin": {"type": "string"},
                "destination": {"type": "string"},
            },
        },
    },
}

MODELS_TO_TRY = [
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.3-70b-instruct",
    "mistralai/mixtral-8x22b-instruct-v0.1",
]

for model in MODELS_TO_TRY:
    print(f"\n=== {model} ===")
    try:
        start = time.time()
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "My flight was cancelled."}],
            tools=[TOOL],
            tool_choice={"type": "function", "function": {"name": "extract_facts"}},
            temperature=0,
        )
        elapsed = time.time() - start
        call = resp.choices[0].message.tool_calls[0]
        print(f"Time: {elapsed:.2f}s")
        print(f"Args: {call.function.arguments}")
    except Exception as e:
        print(f"FAILED: {e}")