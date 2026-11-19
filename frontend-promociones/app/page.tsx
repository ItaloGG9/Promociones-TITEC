"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import PromoTicketCard from "./components/PromoTicketCard";


type Promocion = {
  id: number;
  idBackend?: string;
  idEvento: string;
  fechaFin: string;
  codigo: string;
  descuento: string;
  descripcion: string;
  condiciones: string;
  validoHasta: string;
  isActiva: boolean;
  stockTotal: number;
  stockUsado: number;
};

type PromocionAPI = {
  _id: string;
  nombre_codigo: string;
  id_evento: string;
  porcentaje_descuento: number;
  fecha_fin: string;
  cantidad_codigos: number;
  usos_actuales: number;
  minimo_entradas: number;
  activo: boolean;
};


// Fecha de hoy en hora local (YYYY-MM-DD), para comparar con el valor del <input type="date">
function fechaHoyLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

// Fin del día elegido en hora local (Chile), convertido a ISO para el backend.
// Antes se enviaba "T23:59:59.000Z" (UTC): en Chile eso son las 20:59 o 21:59 del mismo día,
// por lo que una promoción "hasta hoy" vencía antes de terminar el día.
function finDelDiaLocal(fecha: string) {
  return new Date(`${fecha}T23:59:59`).toISOString();
}

// Inicio de sesión de la plataforma (front común, módulo Auth). Configurable con NEXT_PUBLIC_LOGIN_URL;
// por defecto, /auth del front común en el mismo host (puerto 3000), volviendo a esta página.
function urlLogin() {
  if (typeof window === "undefined") return "/auth";
  const base = process.env.NEXT_PUBLIC_LOGIN_URL
    || `${window.location.protocol}//${window.location.hostname}:3000/auth`;
  return `${base}${base.includes("?") ? "&" : "?"}volver=${encodeURIComponent(window.location.href)}`;
}

export default function Home() {
    // Evento que se mostrará en el panel
  const idEvento = process.env.NEXT_PUBLIC_EVENTO_ID || "evt-demo";
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState("Porcentaje (%)");
  const [promoEditando, setPromoEditando] = useState<Promocion | null>(null);
  const [errorFormulario, setErrorFormulario] = useState("");
  // true cuando Promociones responde 401 (sin sesión de Auth): se ofrece ir al login común
  const [necesitaLogin, setNecesitaLogin] = useState(false);

  // Cargar las promociones desde el backend
  useEffect(() => {
    async function cargarPromociones() {
      try {
        const respuesta = await fetch(`/api/promociones/evento/${idEvento}`, {
          cache: "no-store"
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las promociones");
        }

        const datos: PromocionAPI[] = await respuesta.json();

        // Adaptar los datos al formato de las tarjetas
        const lista = datos.map((promo, index) => {
          const fecha = new Date(promo.fecha_fin);

          return {
            id: index + 1,
            idBackend: promo._id,
            idEvento: promo.id_evento,
            fechaFin: promo.fecha_fin,
            codigo: promo.nombre_codigo,
            descuento: `${promo.porcentaje_descuento}%`,
            descripcion: `Promoción del evento ${promo.id_evento}`,
            condiciones: `Mínimo ${promo.minimo_entradas} entrada(s)`,
            validoHasta: fecha.toLocaleDateString("es-CL", {
              timeZone: "UTC"
            }),
            isActiva: promo.activo,
            stockTotal: promo.cantidad_codigos + promo.usos_actuales,
            stockUsado: promo.usos_actuales
          };
        });

        setPromociones(lista);
        setError("");
      } catch {
        setError("No se pudieron cargar las promociones");
      } finally {
        setCargando(false);
      }
    }

    
    // Cargar las promociones al abrir la página
    cargarPromociones();

    // Actualizar las promociones cada 10 segundos
    const intervalo = setInterval(cargarPromociones, 10000);

    // Detener la actualización al salir de la página
    return () => clearInterval(intervalo);
  }, [idEvento]);

  // Activar o desactivar una promoción en el backend
  const toggleEstadoPromocion = async (id: number) => {
    const promo = promociones.find(p => p.id === id);

    if (!promo || !promo.idBackend) {
      setError("La promoción no tiene un identificador en la base de datos");
      return;
    }

    try {
      // Enviar el cambio al backend mediante el Gateway
      const respuesta = await fetch(`/api/promociones/${promo.idBackend}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          activo: !promo.isActiva
        })
      });

      // Comprobar si se pudo modificar la promoción
      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setNecesitaLogin(true);
          throw new Error("Debes iniciar sesión para modificar promociones");
        }

        if (respuesta.status === 403) {
          throw new Error("No tienes permisos para modificar promociones");
        }

        throw new Error("No se pudo modificar la promoción");
      }

      const actualizada = await respuesta.json();

      // Actualizar la tarjeta cuando el backend confirme el cambio
      setPromociones(actuales =>
        actuales.map(p =>
          p.idBackend === promo.idBackend
            ? { ...p, isActiva: actualizada.activo }
            : p
        )
      );

      setError("");

    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al modificar la promoción");
    }
  };


  
const handleAbrirEdicion = (id: number) => {
  const promo = promociones.find(p => p.id === id);

  if (promo) {
    // Limpiar errores anteriores
    setErrorFormulario("");

    // Guardar la promoción que vamos a editar
    setPromoEditando(promo);
    setTipoDescuento("Porcentaje (%)");
    setIsModalOpen(true);
  }
};


  
  // Guardar una promoción en el backend
  const handleGuardarPromocion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorFormulario("");

    // Obtener los datos del formulario
    const datos = new FormData(e.currentTarget);

    const codigo = String(datos.get("codigo") || "").trim().toUpperCase();
    const evento = String(datos.get("evento") || "");
    const descuento = Number(datos.get("valor"));
    const stock = Number(datos.get("stock"));
    const fechaLimite = String(datos.get("fechaLimite") || "");

    // La fecha límite no puede ser anterior a hoy (el input tiene "min", pero se puede escribir a mano)
    if (fechaLimite && fechaLimite < fechaHoyLocal()) {
      setErrorFormulario("La fecha límite no puede ser una fecha pasada");
      return;
    }

    // Comprobar los valores antes de enviarlos
    if (!codigo || !evento || !fechaLimite ||
        !Number.isInteger(descuento) || descuento < 1 || descuento > 100 ||
        !Number.isInteger(stock) || stock < 1) {
      setErrorFormulario("Revisa los datos de la promoción");
      return;
    }

    // Si estamos editando una promoción existente
    if (promoEditando) {
      if (!promoEditando.idBackend) {
        setErrorFormulario("No se encontró la promoción en MongoDB");
        return;
      }

      // No permitir cambiar el evento
      if (evento !== promoEditando.idEvento) {
        setErrorFormulario("No se puede cambiar el evento");
        return;
      }

      // El stock total no puede ser menor que los usos registrados
      if (stock < promoEditando.stockUsado) {
        setErrorFormulario("El stock no puede ser menor que los cupones utilizados");
        return;
      }

      // Preparar los datos de la edición
      const cambios = {
        nombre_codigo: codigo,
        porcentaje_descuento: descuento,
        fecha_fin: finDelDiaLocal(fechaLimite),
        cantidad_codigos: stock - promoEditando.stockUsado
      };

      try {
        // Enviar la edición al backend
        const respuesta = await fetch(
          `/api/promociones/${promoEditando.idBackend}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(cambios)
          }
        );

        const resultado = await respuesta.json();

        // Revisar si la edición fue permitida
        if (!respuesta.ok) {
          if (respuesta.status === 401) {
          setNecesitaLogin(true);
            throw new Error("Debes iniciar sesión para editar promociones");
          }

          if (respuesta.status === 403) {
            throw new Error("No tienes permisos para editar promociones");
          }

          throw new Error(resultado.mensaje || "No se pudo editar la promoción");
        }

        // Recargar las promociones después de guardar
        setIsModalOpen(false);
        setPromoEditando(null);
        window.location.reload();

      } catch (error) {
        setErrorFormulario(
          error instanceof Error ? error.message : "Error al editar la promoción"
        );
      }

      // Terminar aquí para no ejecutar el POST de creación
      return;
    }

    // Preparar los datos que necesita el backend
    const nuevaPromocion = {
      nombre_codigo: codigo,
      id_evento: evento,
      porcentaje_descuento: descuento,
      fecha_inicio: new Date().toISOString(),
      fecha_fin: finDelDiaLocal(fechaLimite),
      cantidad_codigos: stock,
      minimo_entradas: 1,
      max_usos_por_cuenta: 1
    };

    try {
      // Enviar la promoción mediante el API Gateway
      const respuesta = await fetch("/api/promociones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(nuevaPromocion)
      });

      const resultado = await respuesta.json();

      // Revisar si el backend rechazó la solicitud
      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setNecesitaLogin(true);
          throw new Error("Debes iniciar sesión para crear promociones");
        }

        if (respuesta.status === 403) {
          throw new Error("No tienes permisos para crear promociones");
        }

        throw new Error(resultado.mensaje || "No se pudo crear la promoción");
      }

      // Recargar para consultar nuevamente los datos de MongoDB
      setIsModalOpen(false);
      window.location.reload();

    } catch (error) {
      setErrorFormulario(
        error instanceof Error ? error.message : "Error al guardar la promoción"
      );
    }
  };
  
  // Obtener los datos de la promoción que se está editando
  const getValoresPorDefecto = () => {
    if (!promoEditando) {
      return {
        evento: "",
        codigo: "",
        valor: "",
        stock: "",
        descripcion: "",
        fechaLimite: ""
      };
    }

    return {
      evento: promoEditando.idEvento,
      codigo: promoEditando.codigo,
      valor: promoEditando.descuento.replace("%", ""),
      stock: promoEditando.stockTotal,
      descripcion: promoEditando.descripcion,
      fechaLimite: promoEditando.fechaFin.slice(0, 10)
    };
  };


  const defaults = getValoresPorDefecto();

  // NUEVO: Calculamos la fecha de hoy en formato YYYY-MM-DD para bloquear fechas pasadas
  const fechaMinima = fechaHoyLocal();

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-brand-navy uppercase tracking-wide">
          Gestión de Promociones
        </h1>
      </div>

      <div className="bg-brand-light rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-brand-border mb-8">
        <div>
          <p className="text-xs font-bold text-status-neutral-text uppercase tracking-wider mb-1">
            Panel Global
          </p>
          <h2 className="text-xl font-bold text-brand-navy">
            Promociones del evento {idEvento}
          </h2>
        </div>
        <button 
          onClick={() => {
            setPromoEditando(null);
            setErrorFormulario("");
            setTipoDescuento("Porcentaje (%)");
            setIsModalOpen(true);
          }}
          className="bg-brand-navy hover:bg-[#1a294d] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-2" />
          Nueva Promoción
        </button>
      </div>

      {cargando && (
        <p>Cargando promociones...</p>
      )}

      {necesitaLogin && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
          <span>Para crear o modificar promociones debes iniciar sesión con tu cuenta de Ticket-U (organizador).</span>
          <a href={urlLogin()} className="px-4 py-2 rounded-lg bg-brand-navy text-white font-semibold text-center">
            Iniciar sesión
          </a>
        </div>
      )}

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      <div className="flex flex-col gap-5">
        {promociones.map((promo) => (
          <PromoTicketCard 
            key={promo.id}
            id={promo.id} 
            codigo={promo.codigo}
            descuento={promo.descuento}
            descripcion={promo.descripcion}
            condiciones={promo.condiciones}
            validoHasta={promo.validoHasta}
            isActiva={promo.isActiva}
            stockTotal={promo.stockTotal}
            stockUsado={promo.stockUsado}
            onToggleActiva={toggleEstadoPromocion}
            onEditar={handleAbrirEdicion}
          />
        ))}
        {promociones.length === 0 && (
          <p className="text-center text-status-neutral-text py-10">No hay promociones activas.</p>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleGuardarPromocion}
            className="bg-white rounded-xl shadow-xl w-full max-w-[520px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="text-lg font-bold text-brand-navy">
                {promoEditando ? "Editar Promoción" : "Crear Nueva Promoción"}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-brand-light rounded-md text-status-neutral-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-1.5">Seleccionar Evento</label>
                <select 
                  name="evento"
                  defaultValue={defaults.evento}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all bg-white text-gray-700"
                >
                  <option value="">-- Elige un evento --</option>
                  <option value={idEvento}>Evento ({idEvento})</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Código</label>
                  <input 
                    type="text" 
                    name="codigo"
                    defaultValue={defaults.codigo}
                    required
                    placeholder="Ej. PROMO20" 
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy uppercase placeholder:normal-case transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Fecha Límite</label>
                  <input 
                    type="date" 
                    name="fechaLimite"
                    defaultValue={defaults.fechaLimite}
                    min={fechaMinima} // <-- NUEVO: Aquí bloqueamos las fechas pasadas
                    required
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all text-gray-700"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Tipo de Descuento</label>
                  <select 
                    value={tipoDescuento}
                    onChange={(e) => setTipoDescuento(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all bg-white text-gray-700"
                  >
                    <option value="Porcentaje (%)">Porcentaje (%)</option>
                  </select>
                </div>
                
                {tipoDescuento !== "2x1" && (
                  <div className="flex-1 animate-in fade-in zoom-in-95">
                    <label className="block text-sm font-semibold text-brand-navy mb-1.5">Valor del Descuento</label>
                    <div className="relative">
                      {tipoDescuento === "Monto Fijo ($)" && (
                        <span className="absolute left-3 top-2.5 text-status-neutral-text font-bold">$</span>
                      )}
                      <input 
                        type="number" 
                        name="valor"
                        defaultValue={defaults.valor}
                        required
                        placeholder={tipoDescuento === "Porcentaje (%)" ? "Ej. 20" : "Ej. 5000"} 
                        className={`w-full h-10 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all ${
                          tipoDescuento === "Monto Fijo ($)" ? "pl-7 pr-3" : "pl-3 pr-8"
                        }`}
                      />
                      {tipoDescuento === "Porcentaje (%)" && (
                        <span className="absolute right-3 top-2.5 text-status-neutral-text font-bold">%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 p-4 bg-brand-light rounded-lg border border-brand-border">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Stock Total</label>
                  <input 
                    type="number" 
                    name="stock"
                    defaultValue={defaults.stock}
                    required
                    placeholder="Ej. 100" 
                    className="w-full h-9 px-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-navy transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Usos por persona</label>
                  <input 
                    type="number" 
                    value="1" 
                    disabled 
                    className="w-full h-9 px-3 rounded-md border border-brand-border bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-1.5">Descripción para el comprador</label>
                <input 
                  type="text" 
                  name="descripcion"
                  defaultValue={defaults.descripcion}
                  required
                  placeholder="Ej. Descuento exclusivo en preventa" 
                  className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all"
                />
              </div>
            </div>
            {errorFormulario && (
              <p className="px-5 pb-2 text-sm text-red-600">
                {errorFormulario}
                {necesitaLogin && (
                  <> · <a href={urlLogin()} className="underline font-semibold">Iniciar sesión</a></>
                )}
              </p>
            )}
            <div className="p-5 border-t border-brand-border flex items-center justify-end gap-3 bg-gray-50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-5 text-sm font-semibold text-status-neutral-text hover:bg-brand-border hover:text-brand-navy rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="h-10 px-5 text-sm font-semibold bg-brand-navy text-white hover:bg-[#1a294d] rounded-lg transition-colors shadow-sm"
              >
                {promoEditando ? "Guardar Cambios" : "Guardar Promoción"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
