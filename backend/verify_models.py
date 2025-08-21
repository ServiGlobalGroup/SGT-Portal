#!/usr/bin/env python3
"""
Script para verificar que las relaciones de los modelos estén correctas
"""

import sys
import os

# Asegurar que podamos importar los modelos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.models.user import User, UploadHistory
    from app.models.vacation import VacationRequest
    
    print("✅ Modelos importados correctamente")
    
    # Verificar las relaciones del modelo User
    print(f"🔍 Relaciones del modelo User: {User.__mapper__.relationships.keys()}")
    
    # Verificar las relaciones del modelo UploadHistory  
    print(f"🔍 Relaciones del modelo UploadHistory: {UploadHistory.__mapper__.relationships.keys()}")
    
    # Verificar las relaciones del modelo VacationRequest
    print(f"🔍 Relaciones del modelo VacationRequest: {VacationRequest.__mapper__.relationships.keys()}")
    
    print("✅ Verificación completada")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
