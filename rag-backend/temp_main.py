from rag import ask_with_context, retrieve_hybrid

if __name__ == "__main__":
    question = "can you tell me a little bit about yourself? be very short and concise "
    retrieved = retrieve_hybrid(question)
    answer = ask_with_context(question, retrieved)
    print("\nAnswer:", answer)
