import community
from collections import Counter
import networkx as nx
import re
import json
from typing import Dict, Any
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

def extract_topics_from_text(text, num_topics=5):
        """Extract meaningful topics from text using improved preprocessing and filtering."""
        if not text or len(text) < 50:
            return []

        cleaned_text = re.sub(r'[^\w\s]', '', text.lower())  
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  

        words = word_tokenize(cleaned_text)
        stop_words = set(stopwords.words('english'))
        filtered_words = [
            word for word in words
            if word not in stop_words and len(word) > 2 and word.isalpha()
        ]

        filtered_words = [
            word for word in filtered_words
            if not _is_repetitive_or_noisy(word)
        ]

        word_freq = Counter(filtered_words)
        return [word for word, _ in word_freq.most_common(num_topics)]

def _is_repetitive_or_noisy(word):
    """Check if a word is repetitive or noisy (e.g., 'ssssssssswswwwwwsswws')."""
    if len(set(word)) < 3: 
        return True

    if re.match(r'^(.)\1*(.)\2*$', word): 
        return True

    return False

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

def filter_json_data(json_data, query_terms):
    """
    Filter JSON data to extract relevant information based on query terms.
    Shortens the JSON data by removing irrelevant parts and keeping only the most relevant data.
    """
    if not json_data:
        return {}

    query_terms_lower = [term.lower() for term in query_terms if term]

    def _filter(data):
        """
        Recursively filter JSON data based on query terms.
        """
        if isinstance(data, dict):
            filtered_dict = {}
            for key, value in data.items():
                key_str = str(key).lower()
                if any(term in key_str for term in query_terms_lower):
                    filtered_dict[key] = value
                    continue

                if isinstance(value, str) and any(term in value.lower() for term in query_terms_lower):
                    filtered_dict[key] = value
                    continue

                if isinstance(value, (dict, list)):
                    filtered_value = _filter(value)
                    if filtered_value: 
                        filtered_dict[key] = filtered_value

            return filtered_dict if filtered_dict else None

        elif isinstance(data, list):
            filtered_list = []
            for item in data:
                if isinstance(item, str) and any(term in item.lower() for term in query_terms_lower):
                    filtered_list.append(item)
                    continue

                if isinstance(item, (dict, list)):
                    filtered_item = _filter(item)
                    if filtered_item: 
                        filtered_list.append(filtered_item)

            return filtered_list if filtered_list else None

        else:
            if isinstance(data, str) and any(term in data.lower() for term in query_terms_lower):
                return data
            return None

    filtered_data = _filter(json_data)

    if not filtered_data:
        if isinstance(json_data, dict):
            return dict(list(json_data.items())[:3])  
        elif isinstance(json_data, list):
            return json_data[:3] 
        else:
            return json_data 

    return filtered_data

def reduce_data_context(data: Dict[str, Any], max_items: int = 5) -> Dict[str, Any]:
    """Reduce data context size by limiting number of items"""
    
    if not data:
        return {}
    
    reduced_data = {}
    
    for key, value in data.items():
        if isinstance(value, list):
            reduced_data[key] = value[:max_items]
            if len(value) > max_items:
                reduced_data[f"{key}_count"] = len(value)
        elif isinstance(value, dict):
            reduced_data[key] = reduce_data_context(value, max_items//2)
        else:
            reduced_data[key] = value
    
    return reduced_data