import os
import requests
import time

output_dir = "static/images"
os.makedirs(output_dir, exist_ok=True)

headers = {"User-Agent": "Mozilla/5.0 (compatible; NetrunnerBot/1.0)"}

start = 11154
for i in range(start, 100000):
    code = f"{i:05d}"
    url = f"https://card-images.netrunnerdb.com/v2/large/{code}.jpg"
    dest = os.path.join(output_dir, f"{code}.jpg")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            with open(dest, "wb") as f:
                f.write(response.content)
            print(f"Téléchargé : {code}.jpg")
        else:
            print(f"Pas trouvé : {code}.jpg")
    except Exception as e:
        print(f"Erreur pour {code}: {e}")
    time.sleep(0.2)  # Pause de 200ms entre chaque requête