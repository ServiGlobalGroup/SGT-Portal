import jsPDF from 'jspdf';
import { DietaRecord } from '../types';

export interface DietaExportOptions {
  includeIndividualPages: boolean;
  includeHeader: boolean;
  logoPath?: string;
}

export class DietasPDFExporter {
  private doc: jsPDF;
  private logoSGTBase64?: string;
  private logoEmatraBase64?: string;

  constructor() {
    this.doc = new jsPDF();
  }

  /**
   * Convierte una imagen a Base64 para incluirla en el PDF
   */
  private async imageToBase64(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('No se pudo crear el contexto del canvas');
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Error cargando la imagen');
      img.src = imagePath;
    });
  }

  /**
   * Carga los logos de SGT y EMATRA en Base64
   */
  private async loadLogos(): Promise<void> {
    console.log('🖼️ Iniciando carga de logos...');
    
    try {
      // Cargar logo de SGT
      this.logoSGTBase64 = await this.imageToBase64('/images/logosgt.webp');
      console.log('✅ Logo SGT cargado:', this.logoSGTBase64 ? 'Sí' : 'No');
    } catch (error) {
      console.warn('❌ No se pudo cargar el logo de SGT:', error);
    }

    try {
      // Cargar logo de EMATRA
      this.logoEmatraBase64 = await this.imageToBase64('/images/Ematra.webp');
      console.log('✅ Logo EMATRA cargado:', this.logoEmatraBase64 ? 'Sí' : 'No');
    } catch (error) {
      console.warn('❌ No se pudo cargar el logo de EMATRA:', error);
    }
  }

  /**
   * Exporta un PDF continuo con todas las dietas en formato compacto
   */
  async exportContinuousPDF(dietas: DietaRecord[], monthYear: string): Promise<void> {
    if (!dietas.length) {
      throw new Error('No hay dietas para exportar');
    }

    await this.loadLogos();
    
    // Crear un nuevo documento PDF
    this.doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Generar PDF continuo
    this.generateContinuousDietasPDF(dietas, monthYear);

    // Descargar el PDF
    const fileName = `dietas_registro_${monthYear}_${new Date().toISOString().slice(0, 10)}.pdf`;
    this.doc.save(fileName);
  }

  /**
   * Exporta las dietas a PDF y retorna como Blob (para subida masiva)
   */
  async exportContinuousPDFAsBlob(dietas: DietaRecord[], monthYear: string): Promise<Blob> {
    if (!dietas.length) {
      throw new Error('No hay dietas para exportar');
    }

    await this.loadLogos();
    
    // Crear un nuevo documento PDF
    this.doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Generar PDF continuo
    this.generateContinuousDietasPDF(dietas, monthYear);

    // Retornar como Blob en lugar de descargar
    return this.doc.output('blob');
  }

  /**
   * Genera un PDF continuo con todas las dietas
   */
  private generateContinuousDietasPDF(dietas: DietaRecord[], monthYear: string): void {
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    let yPosition = 15;

    // Header principal compacto
    yPosition = this.addCompactHeader(monthYear, yPosition);

    // Agrupar dietas por usuario para mostrar el nombre solo una vez
    const dietasGrouped = this.groupDietasByUser(dietas);

    // Procesar cada grupo de dietas
    Object.entries(dietasGrouped).forEach(([, userDietas], groupIndex) => {
      // Cada trabajador nuevo empieza en página nueva (excepto el primero)
      if (groupIndex > 0) {
        // Agregar footer a la página anterior antes de cambiar
        this.addPageFooter();
        this.doc.addPage();
        yPosition = 15;
        // Agregar header completo para cada trabajador nuevo
        yPosition = this.addCompactHeader(monthYear, yPosition);
      }

      // Mostrar el nombre del usuario solo una vez al inicio
      const userTotalAmount = userDietas.reduce((sum, dieta) => sum + dieta.total_amount, 0);
      yPosition = this.addUserHeader(userDietas[0], yPosition, margin, groupIndex + 1, monthYear, userTotalAmount);

      // Procesar cada dieta del usuario
      userDietas.forEach((dieta) => {
        // Verificar espacio para esta dieta individual (reservar espacio para footer)
        const estimatedHeight = this.estimateDietaHeight(dieta);
        if (yPosition + estimatedHeight > pageHeight - 25) {
          // Agregar footer antes de nueva página
          this.addPageFooter();
          // Nueva página sin repetir el header del usuario
          this.doc.addPage();
          yPosition = 15;
        }

        // Generar la dieta (sin mostrar nombre de usuario)
        yPosition = this.generateCompactDietaSection(dieta, yPosition, margin, false);
        
        // Espacio más compacto entre dietas del mismo usuario
        yPosition += 3;
      });

      // Espacio extra más compacto entre diferentes usuarios
      yPosition += 2;
    });

    // Footer en la última página
    this.addPageFooter();
  }

  /**
   * Agrupa las dietas por usuario para mostrar el nombre solo una vez
   */
  private groupDietasByUser(dietas: DietaRecord[]): Record<string, DietaRecord[]> {
    const grouped: Record<string, DietaRecord[]> = {};
    
    dietas.forEach(dieta => {
      const key = `${dieta.user_id}_${dieta.user_name || 'N/A'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(dieta);
    });

    return grouped;
  }

  /**
   * Agrega el header compacto del documento
   */
  private addCompactHeader(monthYear: string, startY: number): number {
    const pageWidth = 210;
    let yPosition = startY;

    // Logo - más pequeño y compacto
    const isEmatraProfile = this.detectEmatraProfile();
    console.log('🎯 Perfil detectado:', isEmatraProfile ? 'EMATRA' : 'SERVIGLOBAL');
    
    if (isEmatraProfile && this.logoSGTBase64 && this.logoEmatraBase64) {
      // Mostrar ambos logos para EMATRA - más grandes y mejor espaciados
      console.log('🖼️ Mostrando ambos logos (SGT + EMATRA) - tamaño grande y bien espaciados');
      try {
        this.doc.addImage(this.logoSGTBase64, 'PNG', 15, yPosition, 32, 16);
        this.doc.addImage(this.logoEmatraBase64, 'PNG', 50, yPosition, 28, 14);
        console.log('✅ Ambos logos añadidos correctamente');
      } catch (error) {
        console.warn('❌ Error añadiendo logos duales:', error);
      }
    } else if (this.logoSGTBase64) {
      // Mostrar solo logo SGT para otros perfiles - más grande
      console.log('🖼️ Mostrando solo logo SGT - tamaño grande');
      try {
        this.doc.addImage(this.logoSGTBase64, 'PNG', 15, yPosition, 34, 17);
        console.log('✅ Logo SGT añadido correctamente');
      } catch (error) {
        console.warn('❌ Error añadiendo logo SGT:', error);
      }
    } else {
      console.log('⚠️ No hay logos disponibles para mostrar');
    }

    // Título principal - más separado de los logos y más prominente
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(92, 35, 64); // Color corporativo SGT
    this.doc.text('REGISTRO DE DIETAS DE VIAJE', pageWidth / 2, yPosition + 25, { align: 'center' });

    // Período - más pequeño
    yPosition += 35;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(120, 120, 120);
    this.doc.text(`Período: ${this.formatMonthYear(monthYear)}`, pageWidth / 2, yPosition, { align: 'center' });

    // Separador elegante
    yPosition += 8;
    this.doc.setDrawColor(92, 35, 64);
    this.doc.setLineWidth(0.5);
    this.doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 10;
    this.doc.setTextColor(0, 0, 0); // Reset color
    return yPosition;
  }

  /**
   * Agrega el header del usuario (nombre y DNI)
   */
  private addUserHeader(dieta: DietaRecord, startY: number, margin: number, userIndex: number, monthYear: string, totalAmount: number): number {
    let yPosition = startY;

    // Fondo para el header del usuario
    const pageWidth = 210;
    this.doc.setFillColor(92, 35, 64); // Color corporativo SGT
    this.doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12, 'F');

    // Información del usuario en blanco
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255); // Blanco

    const dniNie = (dieta as any).user_dni_nie || 'N/A';
    const formattedMonthYear = this.formatToMMYY(monthYear);
    const userInfo = `${userIndex}. ${dieta.user_name || 'N/A'} (${dniNie}) - ${formattedMonthYear}`;
    this.doc.text(userInfo, margin + 5, yPosition + 6);

    // Total de dinero en el lado derecho
    const totalText = `${totalAmount.toFixed(2)} €`;
    this.doc.text(totalText, pageWidth - margin - 5, yPosition + 6, { align: 'right' });

    yPosition += 15;
    this.doc.setTextColor(0, 0, 0); // Reset color
    return yPosition;
  }

  /**
   * Genera una sección compacta para una dieta individual
   */
  private generateCompactDietaSection(dieta: DietaRecord, startY: number, margin: number, _showUserName: boolean): number {
    const pageWidth = 210;
    let yPosition = startY;

    // Fondo suave para cada dieta - más compacto y ligeramente más oscuro
    this.doc.setFillColor(242, 244, 247); // Gris ligeramente más oscuro para mejor contraste
    const sectionHeight = 12 + (dieta.concepts?.length || 0) * 2.5 + 2; // Más compacto
    this.doc.rect(margin + 5, yPosition - 1, pageWidth - 2 * margin - 10, sectionHeight, 'F');

    // Fecha del registro
    const fechaRegistro = this.formatDate(dieta.month);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(60, 60, 60);
    this.doc.text(fechaRegistro, margin + 10, yPosition + 4);

    // Albarán/OC
    const albaran = dieta.order_number || 'Sin albarán';
    this.doc.text(`Albarán: ${albaran}`, margin + 70, yPosition + 4);

    // Total en el lado derecho - color corporativo SGT
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(220, 38, 127); // Rosa corporativo para destacar
    this.doc.text(`${dieta.total_amount.toFixed(2)} €`, pageWidth - margin - 15, yPosition + 4, { align: 'right' });

    yPosition += 8; // Más compacto

    // Conceptos (gris y muy pequeño) - más compacto
    if (dieta.concepts && dieta.concepts.length > 0) {
      this.doc.setFontSize(6.5); // Más pequeño
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(140, 140, 140); // Gris

      // Mostrar conceptos en líneas muy compactas
      dieta.concepts.forEach((concept: any) => {
        const conceptText = `• ${concept.label}: ${concept.quantity} × ${concept.rate.toFixed(2)}€ = ${concept.subtotal.toFixed(2)}€`;
        this.doc.text(conceptText, margin + 18, yPosition);
        yPosition += 2.5; // Más compacto
      });
    }

    // Reset color
    this.doc.setTextColor(0, 0, 0);
    return yPosition + 1; // Menos espacio al final
  }

  /**
   * Estima la altura necesaria para un grupo de dietas de un usuario
   */
  /**
   * Estima la altura necesaria para una dieta individual
   */
  private estimateDietaHeight(dieta: DietaRecord): number {
    let height = 15; // Información básica más compacta
    height += (dieta.concepts?.length || 0) * 2.5; // Conceptos más compactos
    return height;
  }

  /**
   * Agrega el footer compacto con numeración en cada página
   */
  private addPageFooter(): void {
    const pageWidth = 210;
    const pageHeight = 297;
    const currentPage = (this.doc as any).internal.getCurrentPageInfo().pageNumber;
    
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(120, 120, 120);
    
    // Footer compacto en una sola línea
    this.doc.text('SGT Portal', 15, pageHeight - 8);
    this.doc.text(`Página ${currentPage}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
    
    // Reset color
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Formatea una fecha para mostrar en el PDF
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Formatea el mes y año para el header
   */
  private formatMonthYear(monthYear: string): string {
    try {
      const [year, month] = monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
    } catch {
      return monthYear;
    }
  }

  /**
   * Formatea una fecha en formato YYYY-MM a MM/YY
   */
  private formatToMMYY(monthYear: string): string {
    try {
      const [year, month] = monthYear.split('-');
      const shortYear = year.slice(-2); // Últimos 2 dígitos del año
      return `${month.padStart(2, '0')}/${shortYear}`;
    } catch (error) {
      console.warn('Error formateando fecha MM/YY:', error);
      return monthYear;
    }
  }

  /**
   * Detecta si el usuario actual está en un perfil de empresa EMATRA
   */
  private detectEmatraProfile(): boolean {
    try {
      // Método 1: Verificar selected_company en localStorage
      const selectedCompany = localStorage.getItem('selected_company');
      console.log('🏢 Selected company from localStorage:', selectedCompany);
      
      if (selectedCompany === 'EMATRA') {
        console.log('✅ EMATRA detected via selectedCompany');
        return true;
      }
      
      // Método 2: Verificar datos del usuario
      const userDataRaw = localStorage.getItem('user_data');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        console.log('👤 User data company:', userData?.company);
        
        // Verificar diferentes formas en que puede venir la empresa
        if (userData.company === 'EMATRA' || 
            userData.empresa === 'EMATRA' || 
            userData.companyName?.toUpperCase().includes('EMATRA')) {
          console.log('✅ EMATRA detected via userData');
          return true;
        }
        
        // Si es objeto, verificar propiedades
        if (userData.company && typeof userData.company === 'object') {
          const companyValue = userData.company.value || userData.company.name || '';
          if (String(companyValue).toUpperCase() === 'EMATRA') {
            console.log('✅ EMATRA detected via userData.company object');
            return true;
          }
        }
      }
      
      // Método 3: Verificar contexto de sesión
      const sessionOverride = sessionStorage.getItem('session_company_override');
      console.log('📄 Session company override:', sessionOverride);
      if (sessionOverride === 'EMATRA') {
        console.log('✅ EMATRA detected via sessionStorage');
        return true;
      }
      
      console.log('❌ EMATRA not detected, using SERVIGLOBAL profile');
      return false;
    } catch (error) {
      console.warn('⚠️ Error detectando perfil EMATRA:', error);
      return false;
    }
  }

}