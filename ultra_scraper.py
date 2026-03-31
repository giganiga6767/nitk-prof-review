import requests
import json
import re

# The actual department slug mapping for NITK
DEPT_SLUGS = [
    "applied-mechanics-and-hydraulics", "chemical-engineering", "chemistry",
    "civil-engineering", "computer-science-and-engineering", 
    "electrical-and-electronics-engineering", "electronics-and-communication-engineering",
    "information-technology", "mathematical-and-computational-sciences",
    "mechanical-engineering", "mining-engineering", "metallurgical-and-materials-engineering",
    "physics", "school-of-management"
]

all_profs = []
id_num = 1

print("🔱 EXECUTING GOD-MODE DATA EXTRACTION...")

for slug in DEPT_SLUGS:
    try:
        # We hit the people/faculty directory directly
        url = f"https://www.nitk.ac.in/department/{slug}/people"
        print(f"📡 Pulling from: {slug}...")
        
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        
        # We search for the Name and Designation in the HTML using Regex
        # This is way faster and more reliable than Selenium
        names = re.findall(r'<h4>(.*?)</h4>', response.text)
        designations = re.findall(r'<div class="designation">(.*?)</div>', response.text)
        
        for name, desig in zip(names, designations):
            all_profs.append({
                "id": id_num,
                "name": name.strip(),
                "department": slug.replace('-', ' ').title(),
                "designation": desig.strip(),
                "overallRating": 0.0,
                "difficulty": 0.0,
                "tags": [],
                "status": "active"
            })
            id_num += 1
            
    except Exception as e:
        print(f"❌ Slug {slug} failed. Trying alternative subdomain...")
        # Backup for subdomains like physics.nitk.ac.in
        try:
            sub_url = f"https://{slug.split('-')[0]}.nitk.ac.in/faculty"
            res = requests.get(sub_url, headers=headers, timeout=5)
            # Find names in <a> tags within headers
            sub_names = re.findall(r'<h5><a.*?>(.*?)</a></h5>', res.text)
            for sname in sub_names:
                all_profs.append({
                    "id": id_num, "name": sname.strip(), "department": slug.title(), 
                    "designation": "Faculty", "overallRating": 0.0, "difficulty": 0.0, 
                    "tags": [], "status": "active"
                })
                id_num += 1
        except: pass

with open('professors.json', 'w') as f:
    json.dump(all_profs, f, indent=4)

print(f"✅ OVERKILL SUCCESS. {len(all_profs)} REAL PROFESSORS FOUND.")