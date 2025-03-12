import community
from collections import Counter
import networkx as nx
import re
import json

def extract_topics_from_text(text, num_topics=5):
    """Extract topics from text using LDA."""
    if not text or len(text) < 50:
        return []
        
    cleaned_text = re.sub(r'[^\\w\\s]', '', text.lower())
    
    words = cleaned_text.split()
    word_freq = Counter(words)

    stopwords = {'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'this', 'it', 'for', 'on', 'with', 'as', 'by'}
    for word in stopwords:
        if word in word_freq:
            del word_freq[word]
    
    return [word for word, _ in word_freq.most_common(num_topics)]

def detect_communities(nodes, links):
    """Detect communities in the network graph."""
    graph = nx.Graph()
    
    for node in nodes:
        graph.add_node(node["id"], group=node["group"])
    
    for link in links:
        graph.add_edge(link["source"], link["target"], weight=link["value"])
    
    partition = community.best_partition(graph)
    
    for node in nodes:
        node["community"] = partition[node["id"]]
    
    return nodes

def process_reddit_data(jsonl_file="data/data.jsonl"):
    """Process the Reddit data from a JSONL file."""
    data = []
    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                post = json.loads(line)
                data.append(post)
            except json.JSONDecodeError:
                continue
    return data