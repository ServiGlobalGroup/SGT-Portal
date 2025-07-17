import fitz  # PyMuPDF
import re
import os
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PayrollPDFProcessor:
    """
    Servicio para procesar PDFs con múltiples nóminas.
    Extrae cada página como un PDF individual y lo asigna al trabajador correspondiente.
    """
    
    # Expresión regular mejorada para detectar DNI/NIE español
    DNI_NIE_PATTERN = r'\b(?:[XYZ]?\d{7,8}[A-HJNP-TV-Z]|[XYZ]\d{7}[A-HJNP-TV-Z])\b'
    
    def __init__(self, user_files_base_path: str):
        """
        Inicializa el procesador de PDFs de nóminas.
        
        Args:
            user_files_base_path: Ruta base donde están las carpetas de usuarios
        """
        self.user_files_base_path = Path(user_files_base_path)
        
    def process_payroll_pdf(self, pdf_file_path: str, month_year: Optional[str] = None, document_type: str = "nominas") -> Dict[str, Any]:
        """
        Procesa un PDF con múltiples documentos, extrayendo cada página y 
        asignándola al trabajador correspondiente.
        
        Args:
            pdf_file_path: Ruta del archivo PDF a procesar
            month_year: Mes y año del documento (formato: "junio_2025" o "2025-06")
            document_type: Tipo de documento ("nominas" o "dietas")
            
        Returns:
            Diccionario con los resultados del procesamiento
        """
        results = {
            "processed_pages": 0,
            "successful_assignments": 0,
            "failed_assignments": 0,
            "total_pages": 0,
            "assignment_details": [],
            "errors": []
        }
        
        if not os.path.exists(pdf_file_path):
            results["errors"].append(f"El archivo PDF no existe: {pdf_file_path}")
            return results
        
        try:
            # Abrir el PDF
            pdf_document = fitz.open(pdf_file_path)
            total_pages = pdf_document.page_count
            results["total_pages"] = total_pages
            
            logger.info(f"Procesando PDF con {total_pages} páginas: {pdf_file_path}")
            
            # Procesar cada página
            for page_num in range(total_pages):
                try:
                    page_result = self._process_single_page(
                        pdf_document, 
                        page_num, 
                        month_year,
                        os.path.basename(pdf_file_path),
                        document_type
                    )
                    
                    results["processed_pages"] += 1
                    results["assignment_details"].append(page_result)
                    
                    if page_result["success"]:
                        results["successful_assignments"] += 1
                    else:
                        results["failed_assignments"] += 1
                        
                except Exception as e:
                    error_msg = f"Error procesando página {page_num + 1}: {str(e)}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
                    results["failed_assignments"] += 1
            
            pdf_document.close()
            
        except Exception as e:
            error_msg = f"Error general procesando PDF: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
        
        return results
    
    def _process_single_page(self, pdf_document: fitz.Document, page_num: int, 
                           month_year: Optional[str], original_filename: str, document_type: str = "nominas") -> Dict[str, Any]:
        """
        Procesa una página individual del PDF.
        
        Args:
            pdf_document: Documento PDF abierto
            page_num: Número de página (0-indexed)
            month_year: Mes y año del documento
            original_filename: Nombre del archivo original
            document_type: Tipo de documento ("nominas" o "dietas")
            
        Returns:
            Diccionario con el resultado del procesamiento de la página
        """
        page_result = {
            "page_number": page_num + 1,
            "dni_nie_found": None,
            "user_folder_exists": False,
            "pdf_saved": False,
            "saved_path": None,
            "success": False,
            "error_message": None
        }
        
        try:
            # Obtener la página
            page = pdf_document[page_num]
            
            # Extraer texto de la página
            page_text = page.get_text()
            
            # Buscar DNI/NIE en el texto con métodos mejorados
            dni_nie = self._extract_dni_nie(page_text)
            
            # Si no se encuentra con el método normal, intentar por posición
            if not dni_nie:
                dni_nie = self._extract_dni_nie_by_position(page_text)
            
            if not dni_nie:
                page_result["error_message"] = "No se encontró DNI/NIE en la página"
                logger.warning(f"No se encontró DNI/NIE en página {page_num + 1}. Texto extraído: {page_text[:200]}...")
                return page_result
            
            page_result["dni_nie_found"] = dni_nie
            
            # Verificar si existe la carpeta del usuario
            user_folder = self.user_files_base_path / dni_nie
            
            if not user_folder.exists():
                page_result["error_message"] = f"No existe carpeta para el usuario {dni_nie}"
                return page_result
            
            page_result["user_folder_exists"] = True
            
            # Crear la carpeta según el tipo de documento
            document_folder = user_folder / document_type
            document_folder.mkdir(exist_ok=True)
            
            # Generar nombre del archivo
            filename = self._generate_filename(dni_nie, month_year, original_filename, document_type)
            output_path = document_folder / filename
            
            # Crear un nuevo PDF con solo esta página
            new_pdf = fitz.open()
            new_pdf.insert_pdf(pdf_document, from_page=page_num, to_page=page_num)
            new_pdf.save(str(output_path))
            new_pdf.close()
            
            page_result["pdf_saved"] = True
            page_result["saved_path"] = str(output_path)
            page_result["success"] = True
            
            logger.info(f"Página {page_num + 1} guardada exitosamente para {dni_nie}: {filename}")
            
        except Exception as e:
            page_result["error_message"] = str(e)
            logger.error(f"Error procesando página {page_num + 1}: {str(e)}")
        
        return page_result
    
    def _extract_dni_nie(self, text: str) -> Optional[str]:
        """
        Extrae el DNI/NIE del texto de la página con múltiples estrategias.
        
        Args:
            text: Texto extraído de la página
            
        Returns:
            DNI/NIE encontrado o None si no se encuentra
        """
        if not text or not text.strip():
            logger.warning("Texto vacío o nulo recibido para extracción de DNI/NIE")
            return None
        
        # Limpiar texto: eliminar saltos de línea y espacios extra
        clean_text = ' '.join(text.split())
        logger.debug(f"Texto limpio para búsqueda: {clean_text[:200]}...")
        
        # 1. Buscar patrones más específicos primero (con contexto)
        specific_patterns = [
            r'DNI[:\s\-]*([XYZ]?\d{7,8}[A-HJNP-TV-Z])',
            r'NIE[:\s\-]*([XYZ]\d{7}[A-HJNP-TV-Z])',
            r'N\.?I\.?F\.?[:\s\-]*([XYZ]?\d{7,8}[A-HJNP-TV-Z])',
            r'Documento[:\s\-]*([XYZ]?\d{7,8}[A-HJNP-TV-Z])',
            r'Identificación[:\s\-]*([XYZ]?\d{7,8}[A-HJNP-TV-Z])',
            r'Doc\.?\s*Identidad[:\s\-]*([XYZ]?\d{7,8}[A-HJNP-TV-Z])',
        ]
        
        # Buscar con patrones específicos primero
        for i, pattern in enumerate(specific_patterns):
            matches = re.findall(pattern, clean_text, re.IGNORECASE)
            if matches:
                logger.debug(f"Patrón específico {i+1} encontró matches: {matches}")
                for match in matches:
                    normalized = match.upper().strip()
                    if self._is_valid_dni_nie_format(normalized):
                        logger.info(f"DNI/NIE encontrado con patrón específico: {normalized}")
                        return normalized
        
        # 2. Buscar patrones menos específicos pero más flexibles
        flexible_patterns = [
            r'\b([XYZ]\d{7}[A-HJNP-TV-Z])\b',  # NIE específico
            r'\b(\d{8}[A-HJNP-TV-Z])\b',       # DNI de 8 dígitos
            r'\b(\d{7}[A-HJNP-TV-Z])\b',       # DNI de 7 dígitos
        ]
        
        for i, pattern in enumerate(flexible_patterns):
            matches = re.findall(pattern, clean_text, re.IGNORECASE)
            if matches:
                logger.debug(f"Patrón flexible {i+1} encontró matches: {matches}")
                for match in matches:
                    normalized = match.upper().strip()
                    if self._is_valid_dni_nie_format(normalized):
                        logger.info(f"DNI/NIE encontrado con patrón flexible: {normalized}")
                        return normalized
        
        # 3. Buscar con el patrón general más amplio
        general_matches = re.findall(self.DNI_NIE_PATTERN, clean_text, re.IGNORECASE)
        logger.debug(f"Patrón general encontró matches: {general_matches}")
        
        if general_matches:
            # Filtrar y validar matches
            valid_matches = []
            
            for match in general_matches:
                normalized = match.upper().strip()
                if self._is_valid_dni_nie_format(normalized):
                    valid_matches.append(normalized)
            
            if valid_matches:
                # Priorizar NIE (que empiezan con X, Y, Z) sobre DNI
                nie_matches = [m for m in valid_matches if m[0] in 'XYZ']
                if nie_matches:
                    logger.info(f"NIE encontrado: {nie_matches[0]}")
                    return nie_matches[0]
                
                # Devolver el primer DNI válido
                logger.info(f"DNI encontrado: {valid_matches[0]}")
                return valid_matches[0]
        
        # 4. Último intento: buscar números que podrían ser DNI/NIE sin validación estricta
        logger.warning("No se encontró DNI/NIE con patrones estándar, intentando búsqueda amplia...")
        
        # Buscar secuencias de números seguidas de letra
        loose_pattern = r'\b(\d{7,8}[A-Z])\b'
        loose_matches = re.findall(loose_pattern, clean_text, re.IGNORECASE)
        
        for match in loose_matches:
            normalized = match.upper().strip()
            # Validación más permisiva
            if len(normalized) >= 8 and normalized[-1].isalpha():
                logger.info(f"Posible DNI/NIE encontrado con búsqueda amplia: {normalized}")
                return normalized
        
        logger.warning("No se pudo extraer DNI/NIE del texto")
        return None
    
    def _is_valid_dni_nie_format(self, dni_nie: str) -> bool:
        """
        Valida que el formato del DNI/NIE sea correcto con validación flexible.
        
        Args:
            dni_nie: DNI/NIE a validar
            
        Returns:
            True si el formato es válido, False en caso contrario
        """
        if not dni_nie:
            return False
        
        dni_nie = dni_nie.upper().strip()
        
        # Validación básica de longitud
        if len(dni_nie) < 8 or len(dni_nie) > 9:
            return False
        
        # Patrones válidos más flexibles
        valid_patterns = [
            r'^[XYZ]\d{7}[A-HJNP-TV-Z]$',      # NIE: X1234567L
            r'^\d{8}[A-HJNP-TV-Z]$',           # DNI 8 dígitos: 12345678Z
            r'^\d{7}[A-HJNP-TV-Z]$',           # DNI 7 dígitos: 1234567A
        ]
        
        for pattern in valid_patterns:
            if re.match(pattern, dni_nie):
                return True
        
        # Validación adicional: verificar que termine en letra válida
        if dni_nie[-1] in 'ABCDEFGHJKLMNPQRSTUVWXYZ':
            # Verificar que el resto sean números (excepto la primera letra para NIE)
            if dni_nie[0] in 'XYZ':
                # NIE: primera letra, después números, última letra
                return dni_nie[1:-1].isdigit() and len(dni_nie[1:-1]) == 7
            else:
                # DNI: solo números, última letra
                return dni_nie[:-1].isdigit() and len(dni_nie[:-1]) in [7, 8]
        
        return False
    
    def _extract_dni_nie_by_position(self, text: str, line_number: Optional[int] = None) -> Optional[str]:
        """
        Extrae DNI/NIE buscando en líneas específicas del texto.
        Útil cuando sabemos que el DNI/NIE está siempre en la misma posición.
        
        Args:
            text: Texto extraído de la página
            line_number: Número de línea donde buscar (None para buscar en todas)
            
        Returns:
            DNI/NIE encontrado o None si no se encuentra
        """
        if not text:
            return None
        
        lines = text.split('\n')
        
        # Si se especifica una línea, buscar solo en esa línea
        if line_number is not None:
            if 0 <= line_number < len(lines):
                search_text = lines[line_number]
                logger.debug(f"Buscando en línea {line_number}: {search_text}")
                return self._extract_dni_nie_from_line(search_text)
        else:
            # Buscar en las primeras líneas donde suele estar el DNI/NIE
            for i, line in enumerate(lines[:20]):  # Buscar en las primeras 20 líneas
                if line.strip():
                    result = self._extract_dni_nie_from_line(line)
                    if result:
                        logger.info(f"DNI/NIE encontrado en línea {i}: {result}")
                        return result
        
        return None
    
    def _extract_dni_nie_from_line(self, line: str) -> Optional[str]:
        """
        Extrae DNI/NIE de una línea específica de texto.
        
        Args:
            line: Línea de texto
            
        Returns:
            DNI/NIE encontrado o None
        """
        # Buscar cualquier secuencia que parezca DNI/NIE
        patterns = [
            r'([XYZ]\d{7}[A-Z])',           # NIE
            r'(\d{8}[A-Z])',                # DNI 8 dígitos
            r'(\d{7}[A-Z])',                # DNI 7 dígitos
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, line.upper())
            for match in matches:
                if self._is_valid_dni_nie_format(match):
                    return match
        
        return None
    
    def debug_text_extraction(self, pdf_file_path: str, page_number: int = 0) -> Dict[str, Any]:
        """
        Método para debug: extrae y muestra el texto de una página específica.
        
        Args:
            pdf_file_path: Ruta del archivo PDF
            page_number: Número de página (0-indexed)
            
        Returns:
            Diccionario con información de debug
        """
        debug_info = {
            "page_number": page_number,
            "text_found": False,
            "text_content": "",
            "lines": [],
            "dni_nie_attempts": [],
            "final_dni_nie": None
        }
        
        try:
            pdf_document = fitz.open(pdf_file_path)
            
            if page_number >= pdf_document.page_count:
                debug_info["error"] = f"Página {page_number} no existe. Total de páginas: {pdf_document.page_count}"
                return debug_info
            
            page = pdf_document[page_number]
            text = page.get_text()
            
            debug_info["text_found"] = bool(text.strip())
            debug_info["text_content"] = text
            debug_info["lines"] = [f"Línea {i}: {line}" for i, line in enumerate(text.split('\n')) if line.strip()]
            
            # Intentar extracción normal
            dni_nie_normal = self._extract_dni_nie(text)
            debug_info["dni_nie_attempts"].append({"method": "normal", "result": dni_nie_normal})
            
            # Intentar extracción por posición
            dni_nie_position = self._extract_dni_nie_by_position(text)
            debug_info["dni_nie_attempts"].append({"method": "by_position", "result": dni_nie_position})
            
            # Resultado final
            debug_info["final_dni_nie"] = dni_nie_normal or dni_nie_position
            
            pdf_document.close()
            
        except Exception as e:
            debug_info["error"] = str(e)
        
        return debug_info
    
    def _generate_filename(self, dni_nie: str, month_year: Optional[str], original_filename: str, document_type: str = "nominas") -> str:
        """
        Genera el nombre del archivo para la nómina individual.
        
        Args:
            dni_nie: DNI/NIE del trabajador
            month_year: Mes y año de la nómina
            original_filename: Nombre del archivo original
            
        Returns:
            Nombre del archivo generado
        """
        if not month_year:
            # Si no se proporciona mes/año, usar la fecha actual
            now = datetime.now()
            month_year = f"{now.strftime('%B').lower()}_{now.year}"
        
        # Limpiar el month_year de caracteres especiales
        clean_month_year = re.sub(r'[^\w\-_]', '_', month_year)
        
        # Generar timestamp para evitar conflictos
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Usar el tipo de documento en el nombre del archivo
        document_prefix = "dieta" if document_type == "dietas" else "nomina"
        
        return f"{document_prefix}_{clean_month_year}_{timestamp}.pdf"
    
    def get_processing_summary(self, results: Dict[str, Any]) -> str:
        """
        Genera un resumen legible de los resultados del procesamiento.
        
        Args:
            results: Diccionario de resultados del procesamiento
            
        Returns:
            Resumen en formato texto
        """
        summary = f"""
        Resumen del procesamiento de nóminas:
        =====================================
        
        📄 Páginas procesadas: {results['processed_pages']}
        ✅ Asignaciones exitosas: {results['successful_assignments']}
        ❌ Asignaciones fallidas: {results['failed_assignments']}
        
        """
        
        if results['errors']:
            summary += f"🚨 Errores generales: {len(results['errors'])}\n"
            for error in results['errors']:
                summary += f"   - {error}\n"
        
        if results['assignment_details']:
            summary += "\nDetalle de asignaciones:\n"
            for detail in results['assignment_details']:
                status = "✅" if detail['success'] else "❌"
                dni_nie = detail.get('dni_nie_found', 'No encontrado')
                summary += f"   {status} Página {detail['page_number']}: {dni_nie}"
                
                if not detail['success']:
                    summary += f" - {detail.get('error_message', 'Error desconocido')}"
                else:
                    summary += f" - Guardado en: {detail.get('saved_path', 'Ruta no disponible')}"
                
                summary += "\n"
        
        return summary
    
    def validate_user_folders(self, dni_nie_list: List[str]) -> Dict[str, bool]:
        """
        Valida que existan las carpetas para una lista de DNI/NIE.
        
        Args:
            dni_nie_list: Lista de DNI/NIE a validar
            
        Returns:
            Diccionario con DNI/NIE como clave y boolean indicando si existe la carpeta
        """
        validation_results = {}
        
        for dni_nie in dni_nie_list:
            user_folder = self.user_files_base_path / dni_nie
            validation_results[dni_nie] = user_folder.exists()
        
        return validation_results


class PayrollPDFExtractor:
    """
    Clase auxiliar para extraer información específica de nóminas.
    Puede extenderse para extraer datos adicionales como importes, conceptos, etc.
    """
    
    @staticmethod
    def extract_payroll_amount(text: str) -> Optional[float]:
        """
        Extrae el importe total de la nómina del texto.
        
        Args:
            text: Texto de la nómina
            
        Returns:
            Importe encontrado o None
        """
        # Patrones comunes para importes en nóminas
        patterns = [
            r'TOTAL\s*DEVENGADO[:\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)',
            r'LIQUIDO\s*A\s*PERCIBIR[:\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)',
            r'NETO[:\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Convertir formato español (1.234,56) a formato Python (1234.56)
                amount_str = match.group(1).replace('.', '').replace(',', '.')
                try:
                    return float(amount_str)
                except ValueError:
                    continue
        
        return None
    
    @staticmethod
    def extract_pay_period(text: str) -> Optional[str]:
        """
        Extrae el período de pago de la nómina.
        
        Args:
            text: Texto de la nómina
            
        Returns:
            Período encontrado o None
        """
        # Patrones para períodos de pago
        patterns = [
            r'PERIODO[:\s]*(\w+\s+\d{4})',
            r'MES[:\s]*(\w+\s+\d{4})',
            r'(\w+\s+DE\s+\d{4})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
