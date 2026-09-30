import { Calendar, Tag, AlertCircle } from "lucide-react";

interface PromoTicketProps {
  id: number;
  codigo: string;
  descuento: string;
  descripcion: string;
  condiciones: string;
  validoHasta: string;
  isActiva: boolean;
  stockTotal: number;
  stockUsado: number;
  onToggleActiva?: (id: number) => void;
  onEditar?: (id: number) => void; // <-- NUEVO: Función para editar
}

export default function PromoTicketCard({
  id,
  codigo,
  descuento,
  descripcion,
  condiciones,
  validoHasta,
  isActiva,
  stockTotal,
  stockUsado,
  onToggleActiva,
  onEditar // <-- NUEVO
}: PromoTicketProps) {
  const porcentajeUso = Math.round((stockUsado / stockTotal) * 100);

  return (
    <div className={`flex flex-col sm:flex-row bg-white border rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-all ${isActiva ? 'border-brand-border' : 'border-gray-200 opacity-75'}`}>
      
      <div className={`w-full sm:w-36 flex flex-col justify-center items-center p-6 text-center shrink-0 transition-colors ${isActiva ? 'bg-brand-navy text-white' : 'bg-gray-200 text-gray-500'}`}>
        <span className="font-bold text-3xl tracking-tight">
          {descuento}
        </span>
        <span className={`text-xs uppercase mt-1 font-semibold tracking-widest ${isActiva ? 'text-brand-light' : 'text-gray-400'}`}>
          Promo
        </span>
      </div>

      <div className="border-b sm:border-b-0 sm:border-r border-dashed border-brand-border relative flex items-center justify-center">
        <div className="hidden sm:block absolute -top-3 w-6 h-6 bg-[#F8F9FA] rounded-full border-b border-brand-border" />
        <div className="hidden sm:block absolute -bottom-3 w-6 h-6 bg-[#F8F9FA] rounded-full border-t border-brand-border" />
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className={`w-4 h-4 ${isActiva ? 'text-brand-navy' : 'text-gray-400'}`} />
              <h3 className={`font-bold text-lg tracking-wide uppercase ${isActiva ? 'text-brand-navy' : 'text-gray-500'}`}>
                {codigo}
              </h3>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                isActiva
                  ? "bg-status-success-bg text-status-success-text"
                  : "bg-status-neutral-bg text-status-neutral-text"
              }`}
            >
              {isActiva ? "Activa" : "Inactiva"}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-4 font-sans">
            {descripcion}
          </p>

          <div className={`mb-4 p-3 rounded-lg border ${isActiva ? 'bg-brand-light/50 border-brand-border/50' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-status-neutral-text font-semibold uppercase tracking-wide">Promos Canjeadas</span>
              <span className={`font-bold ${isActiva ? 'text-brand-navy' : 'text-gray-500'}`}>{stockUsado} de {stockTotal} ({porcentajeUso}%)</span>
            </div>
            <div className="w-full bg-brand-border rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  !isActiva ? 'bg-gray-300' :
                  porcentajeUso >= 90 ? 'bg-status-danger-text' : 'bg-brand-accent'
                }`} 
                style={{ width: `${porcentajeUso}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-status-neutral-text flex items-start gap-1.5 mb-4 font-sans">
            <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActiva ? 'text-brand-accent' : 'text-gray-400'}`} />
            {condiciones}
          </p>
        </div>

        <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-status-neutral-text font-sans">
            <Calendar className={`w-4 h-4 ${isActiva ? 'text-brand-accent' : 'text-gray-400'}`} />
            <span>Válido hasta: <strong>{validoHasta}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {/* <-- NUEVO: Botón editar conectado a la función --> */}
            <button 
              onClick={() => onEditar?.(id)}
              className="h-10 px-4 text-sm font-semibold text-brand-navy border border-brand-border hover:bg-brand-light rounded-lg transition-colors"
            >
              Editar
            </button>
            <button 
              onClick={() => onToggleActiva?.(id)}
              className={`h-10 px-4 text-sm font-semibold rounded-lg transition-colors ${
              isActiva 
              ? "text-status-danger-text hover:bg-status-danger-bg" 
              : "text-status-success-text hover:bg-status-success-bg"
            }`}>
              {isActiva ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}