"""
RAG Service — Optimized for Speed
-----------------------------------
LLM      : Groq openai/gpt-oss-120b (streaming)
Embeddings: sentence-transformers all-MiniLM-L6-v2 (local, tiny, fast)
             - Only 90MB, loads once, then instant
             - No API key needed, no rate limits
VectorDB  : FAISS
Web Search: Tavily
Strategy  : Skip LLM relevance check — pure cosine similarity (4x faster)
"""

import os
import json
from groq import Groq
from tavily import TavilyClient
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from dotenv import load_dotenv
load_dotenv()

# ─────────────────────────────────────────────
# CLIENTS
# ─────────────────────────────────────────────

groq_client = Groq()
tavily      = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
MODEL       = "openai/gpt-oss-120b"

# all-MiniLM-L6-v2: 90MB, loads ONCE at startup, inference is instant on CPU
print("[RAG] Loading embedding model...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True, "batch_size": 64},
)
print("[RAG] Embedding model ready ✓")

# In-memory retriever store
_retriever_store = {}


# ─────────────────────────────────────────────
# GROQ LLM HELPER (streaming)
# ─────────────────────────────────────────────

def _groq_chat(messages: list) -> str:
    """Call Groq with streaming, return full text."""
    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=1,
        max_completion_tokens=2048,
        top_p=1,
        reasoning_effort="medium",
        stream=True,
        stop=None,
    )
    full_text = ""
    for chunk in completion:
        full_text += chunk.choices[0].delta.content or ""
    return full_text


# ─────────────────────────────────────────────
# BUILD VECTOR STORE
# ─────────────────────────────────────────────

def build_vector_store(company_id: str, parsed_docs: list) -> bool:
    """
    Build FAISS index from parsed documents.
    parsed_docs: list of dicts with keys: full_text, file_path, doc_type, pages
    """
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=80,
            separators=["\n\n", "\n", ".", " "],
        )
        all_docs = []

        for doc in parsed_docs:
            # doc must be a dict
            if not isinstance(doc, dict):
                print(f"[RAG] Skipping non-dict doc: {type(doc)}")
                continue

            text = doc.get("full_text", "")
            if not text or len(text.strip()) < 50:
                print(f"[RAG] Skipping empty doc: {doc.get('file_path','?')}")
                continue

            # pages is a dict {page_num: text_string}
            pages = doc.get("pages", {})
            if isinstance(pages, dict) and pages:
                good_pages = [
                    v for v in pages.values()
                    if isinstance(v, str) and len(v.strip()) > 80
                ]
                if good_pages:
                    text = "\n\n".join(good_pages)

            chunks = splitter.create_documents(
                texts=[text],
                metadatas=[{
                    "source":     doc.get("file_path", "unknown"),
                    "doc_type":   doc.get("doc_type", "unknown"),
                    "company_id": company_id,
                }]
            )
            all_docs.extend(chunks)

        if not all_docs:
            print(f"[RAG] No usable text found for {company_id}")
            return False

        print(f"[RAG] Embedding {len(all_docs)} chunks for {company_id}...")
        vector_store = FAISS.from_documents(all_docs, embeddings)
        _retriever_store[company_id] = vector_store.as_retriever(
            search_kwargs={"k": 4}
        )

        save_path = f"uploads/{company_id}/faiss_index"
        os.makedirs(save_path, exist_ok=True)
        vector_store.save_local(save_path)
        print(f"[RAG] ✓ Vector store saved for {company_id} ({len(all_docs)} chunks)")
        return True

    except Exception as e:
        print(f"[RAG] build_vector_store error: {e}")
        import traceback; traceback.print_exc()
        return False


def load_vector_store(company_id: str) -> bool:
    try:
        save_path = f"uploads/{company_id}/faiss_index"
        if not os.path.exists(save_path):
            return False
        vector_store = FAISS.load_local(
            save_path, embeddings, allow_dangerous_deserialization=True
        )
        _retriever_store[company_id] = vector_store.as_retriever(
            search_kwargs={"k": 4}
        )
        return True
    except Exception as e:
        print(f"[RAG] load error: {e}")
        return False


# ─────────────────────────────────────────────
# FAST RAG SEARCH
# Direct cosine similarity — NO LLM relevance loop
# ─────────────────────────────────────────────

def search_documents(company_id: str, query: str) -> dict:
    """
    Fast RAG:
    1. Cosine similarity → top-4 chunks (no LLM relevance check)
    2. If chunks found → generate answer
    3. Else → Tavily web fallback
    """
    if company_id not in _retriever_store:
        loaded = load_vector_store(company_id)
        if not loaded:
            return {"answer": "No documents indexed yet.", "context": "", "used_web_search": False}

    retriever = _retriever_store.get(company_id)
    docs = []
    try:
        docs = retriever.invoke(query)
    except Exception as e:
        print(f"[RAG] retrieval error: {e}")

    if docs:
        context = "\n\n---\n\n".join([d.page_content for d in docs[:4]])
        prompt = f"""You are a senior credit analyst. Answer using ONLY the context below. Be specific and cite figures.

Question: {query}

Context:
{context}

If context is insufficient, say so briefly."""

        answer = _groq_chat([{"role": "user", "content": prompt}])
        return {"answer": answer, "context": context, "relevant_docs_count": len(docs), "used_web_search": False}

    # Tavily fallback
    try:
        results = tavily.search(query=query, max_results=3)
        web_ctx = "\n\n".join([
            f"{r.get('title','')}: {r.get('content','')[:300]}"
            for r in results.get("results", [])
        ])
        prompt = f"Answer this credit research question using web results:\n\nQuestion: {query}\n\nResults:\n{web_ctx}"
        answer = _groq_chat([{"role": "user", "content": prompt}])
        return {"answer": answer, "context": web_ctx, "relevant_docs_count": 0, "used_web_search": True}
    except Exception as e:
        return {"answer": f"Could not retrieve: {str(e)}", "context": "", "used_web_search": False}
