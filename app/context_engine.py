import numpy as np
import torch
from sentence_transformers import SentenceTransformer

def init_model(model_name="sentence-transformers/all-MiniLM-L6-v2"):
    return SentenceTransformer(model_name)

def encode_text(text, model):
    if not text.strip():
        text = "[Empty text]"
    embedding = model.encode(text, convert_to_tensor=True)
    if embedding.dim() > 1:
        embedding = embedding.squeeze()
    return embedding

def semantic_coherence(current_embedding, global_context):
    if current_embedding.dim() > 1:
        current_embedding = current_embedding.squeeze()
    similarity = torch.cosine_similarity(current_embedding, global_context, dim=0)
    return similarity.item()


def coherence_patterns(current_embedding, context_embeddings):
    if len(context_embeddings) < 2:
        return 1.0
    if current_embedding.dim() > 1:
        current_embedding = current_embedding.squeeze()
    
    recent_embeddings = context_embeddings[-5:]
    similarities = []
    
    for emb in recent_embeddings:
        if emb.dim() > 1:
            emb = emb.squeeze()
        sim = torch.cosine_similarity(current_embedding, emb, dim=0).item()
        similarities.append(sim)
    
    variance = np.var(similarities) if similarities else 0.0
    coherence = max(0.0, 1.0 - variance)
    return coherence

#--------------------------------
# Initialize the model
# model = init_model()

# # Define a set of example texts
# texts = [
#     """The quick brown fox jumps over the lazy dog.
#     The auburn fox leaps across the idle hound.
#     Nature inspires creativity in countless ways.
#     agile brown fox jumps swiftly over lazy dogs."""
# ]
# # Encode all the texts using our model.
# embeddings = [encode_text(text, model) for text in texts]
# # Create a global context by averaging the embeddings
# global_context = torch.stack(embeddings).mean(dim=0)

# # Example usage
# response = "negra aroyo lane."
# response_embedding = encode_text(response, model)
# sem_coh_score = semantic_coherence(response_embedding, global_context)
# print("Semantic Coherence: ", sem_coh_score)
# -------------------------------------------------------------------------



# Semantic Coherence Example:
# Use the first three texts to create a global context and evaluate the
# semantic coherence of the fourth text (which is empty and adjusted to "[Empty text]").
# global_context = torch.stack(embeddings[:-1]).mean(dim=0)
# sem_coh_score = semantic_coherence(embeddings[3], global_context)
# print("Semantic Coherence (empty text vs. global context):", sem_coh_score)



