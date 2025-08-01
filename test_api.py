import requests
import json

# Login usando form data
print("=== TESTING API UPLOAD HISTORY ===")

login_data = {
    "username": "X9703580H",
    "password": "admin123"
}

print("1. Intentando login...")
response = requests.post("http://127.0.0.1:8000/api/auth/login", data=login_data)

if response.status_code == 200:
    token_data = response.json()
    token = token_data["access_token"]
    user_info = token_data.get("user", {})
    print(f"✅ Login exitoso para: {user_info.get('full_name', 'N/A')} ({user_info.get('role', 'N/A')})")
    
    print("\n2. Consultando historial de subidas...")
    headers = {"Authorization": f"Bearer {token}"}
    history_response = requests.get("http://127.0.0.1:8000/api/user-files/upload-history", headers=headers)
    
    print(f"Status Code: {history_response.status_code}")
    
    if history_response.status_code == 200:
        data = history_response.json()
        print(f"✅ Respuesta exitosa!")
        print(f"Estructura de respuesta:")
        print(f"  - Tipo: {type(data)}")
        print(f"  - Claves: {list(data.keys()) if isinstance(data, dict) else 'No es dict'}")
        
        if 'items' in data:
            items = data['items']
            total = data.get('total', 0)
            print(f"  - Total de registros: {total}")
            print(f"  - Items devueltos: {len(items)}")
            
            if items:
                print(f"\n3. Primer item de ejemplo:")
                first_item = items[0]
                for key, value in first_item.items():
                    print(f"    {key}: {value}")
            else:
                print("⚠️  No se encontraron items en el historial")
        else:
            print("❌ La respuesta no tiene la estructura esperada")
            print(f"Respuesta completa: {json.dumps(data, indent=2, ensure_ascii=False)}")
    else:
        print(f"❌ Error en la consulta: {history_response.status_code}")
        print(f"Detalle: {history_response.text}")
else:
    print(f"❌ Error en login: {response.status_code}")
    print(f"Detalle: {response.text}")

print("\n=== FIN DE PRUEBAS ===")
