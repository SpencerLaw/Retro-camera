import zipfile
import xml.etree.ElementTree as ET
import traceback
import sys

def extract_docx_text(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            tree = ET.XML(docx.read('word/document.xml'))
            # Find all text nodes and paragraphs
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Very simple extraction: just all texts
            texts = []
            for elem in tree.iter():
                if elem.tag == '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p':
                    # Extract text inside a paragraph
                    p_text = "".join(node.text for node in elem.findall('.//w:t', namespaces) if node.text)
                    if p_text:
                        texts.append(p_text)
            
            with open('D:/docx_parsed.txt', 'w', encoding='utf-8') as f:
                f.write('\n'.join(texts))
    except Exception as e:
        with open('error.txt', 'w', encoding='utf-8') as f:
            f.write(traceback.format_exc())

extract_docx_text(r'D:\2026年春季学期“1530”安全教育记录表.docx')
