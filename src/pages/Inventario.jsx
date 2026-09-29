import { useEffect, useState } from 'react';
import * as inventarioApi from '../api/inventario';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const emptyForm = {
  categoriaId: '', nombre: '', tipo: 'EQUIPO', codigoBarras: '', stock: 0, stockMinimo: 0,
  costo: '', precioVenta: '', vendible: false, reservable: false, descuentoApartadoPorcentaje: '',
  disciplinaIds: [],
};

export default function Inventario() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imagenes, setImagenes] = useState([]);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(null);
  const [ajusteDelta, setAjusteDelta] = useState(1);
  const [ajusteRazon, setAjusteRazon] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    loadCategorias();
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, categoriaFiltro, soloStockBajo]);

  function load() {
    inventarioApi.listArticulos(q, page, 20, categoriaFiltro, soloStockBajo).then(({ data }) => setPageData(data.data));
  }

  async function handleScan(e) {
    if (e.key !== 'Enter' || !scanCode.trim()) return;
    try {
      const { data } = await inventarioApi.buscarArticuloPorCodigoBarras(scanCode.trim());
      if (data.data) {
        openEdit(data.data);
        notify(`Articulo encontrado: ${data.data.nombre}`, 'success');
      } else {
        notify('Ningun articulo tiene ese codigo de barras', 'error');
      }
    } catch {
      notify('Ningun articulo tiene ese codigo de barras', 'error');
    } finally {
      setScanCode('');
    }
  }
  function loadCategorias() {
    inventarioApi.listCategoriasInventario().then(({ data }) => setCategorias(data.data));
  }
  function loadImagenes(articuloId) {
    inventarioApi.listImagenesArticulo(articuloId).then(({ data }) => setImagenes(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setImagenes([]);
    setModal({ editing: null });
  }
  function openEdit(a) {
    setForm({
      categoriaId: a.categoriaId || '', nombre: a.nombre, tipo: a.tipo, codigoBarras: a.codigoBarras || '',
      stock: a.stock, stockMinimo: a.stockMinimo, costo: a.costo ?? '', precioVenta: a.precioVenta ?? '',
      vendible: a.vendible, reservable: a.reservable, descuentoApartadoPorcentaje: a.descuentoApartadoPorcentaje ?? '',
      disciplinaIds: a.disciplinaIds || [],
    });
    setModal({ editing: a.id });
    loadImagenes(a.id);
  }

  function toggleDisciplina(id) {
    setForm((f) => ({ ...f, disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id] }));
  }

  async function handleCrearCategoria() {
    if (!nuevaCategoria.trim()) return;
    const { data } = await inventarioApi.createCategoriaInventario({ nombre: nuevaCategoria });
    setNuevaCategoria('');
    loadCategorias();
    setForm((f) => ({ ...f, categoriaId: data.data.id }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      notify('El nombre es obligatorio', 'error');
      return;
    }
    const payload = {
      ...form,
      categoriaId: form.categoriaId || null,
      stock: Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
      costo: form.costo === '' ? null : Number(form.costo),
      precioVenta: form.precioVenta === '' ? null : Number(form.precioVenta),
      descuentoApartadoPorcentaje: form.descuentoApartadoPorcentaje === '' ? null : Number(form.descuentoApartadoPorcentaje),
    };
    try {
      if (modal.editing) {
        await inventarioApi.updateArticulo(modal.editing, payload);
        notify('Articulo actualizado', 'success');
        setModal(null);
      } else {
        const { data } = await inventarioApi.createArticulo(payload);
        notify('Articulo creado, ya puedes subir fotos', 'success');
        setModal({ editing: data.data.id });
        setImagenes([]);
      }
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el articulo', 'error');
    }
  }

  async function handleSubirImagen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoImagen(true);
    try {
      await inventarioApi.subirImagenArticulo(modal.editing, file);
      loadImagenes(modal.editing);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo subir la imagen', 'error');
    } finally {
      setSubiendoImagen(false);
      e.target.value = '';
    }
  }

  async function marcarPrincipal(imagenId) {
    await inventarioApi.marcarImagenPrincipal(modal.editing, imagenId);
    loadImagenes(modal.editing);
    load();
  }

  async function eliminarImagen(imagenId) {
    const ok = await confirmDialog('Quitar esta foto?', { danger: true });
    if (!ok) return;
    await inventarioApi.eliminarImagenArticulo(modal.editing, imagenId);
    loadImagenes(modal.editing);
    load();
  }

  async function handleDeactivate(a) {
    const ok = await confirmDialog(`Desactivar "${a.nombre}"?`, { danger: true });
    if (!ok) return;
    await inventarioApi.deactivateArticulo(a.id);
    notify('Articulo desactivado', 'success');
    load();
  }

  async function handleAjuste(e) {
    e.preventDefault();
    try {
      await inventarioApi.ajustarStock(modalAjuste.id, Number(ajusteDelta), ajusteRazon);
      notify('Stock actualizado', 'success');
      setModalAjuste(null);
      setAjusteDelta(1);
      setAjusteRazon('');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo ajustar el stock', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nuevo articulo</button>
      </div>

      <div className="relative mb-4 max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">📷</span>
        <input
          className="input pl-9"
          placeholder="Escanear codigo de barras (busca y abre el articulo)"
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          onKeyDown={handleScan}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input className="input flex-1 min-w-[220px]" placeholder="Buscar por nombre o codigo..." value={q}
          onChange={(e) => { setPage(0); setQ(e.target.value); }} />
        <select className="input w-52" value={categoriaFiltro} onChange={(e) => { setPage(0); setCategoriaFiltro(e.target.value); }}>
          <option value="">Todas las categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button
          type="button"
          className={'px-3 py-2 rounded-lg text-sm font-medium border transition-colors ' +
            (soloStockBajo ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')}
          onClick={() => { setPage(0); setSoloStockBajo((v) => !v); }}
        >
          ⚠️ Stock bajo
        </button>
        {(q || categoriaFiltro || soloStockBajo) && (
          <button type="button" className="btn-secondary text-sm" onClick={() => { setPage(0); setQ(''); setCategoriaFiltro(''); setSoloStockBajo(false); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Articulo</th>
              <th>Tipo</th>
              <th>Disciplinas</th>
              <th>Stock</th>
              <th>Tienda</th>
              <th>Apartable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((a) => (
              <tr key={a.id} className={'border-b border-gray-50 ' + (a.stock <= a.stockMinimo ? 'bg-red-50/50' : '')}>
                <td className="py-2 font-medium text-gray-800">{a.nombre}</td>
                <td className="text-gray-600">{a.tipo}</td>
                <td className="text-gray-600">{a.disciplinaNombres?.join(', ') || '-'}</td>
                <td className={a.stock <= a.stockMinimo ? 'text-red-600 font-medium' : 'text-gray-700'}>{a.stock}</td>
                <td>{a.vendible ? <span className="text-emerald-600">Si · ${a.precioVenta ?? 0}</span> : <span className="text-gray-400">No</span>}</td>
                <td>{a.reservable ? <span className="text-emerald-600">Si</span> : <span className="text-gray-400">No</span>}</td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => setModalAjuste(a)}>Ajustar</button>
                  <button className="text-brand-600 hover:underline" onClick={() => openEdit(a)}>Editar</button>
                  <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(a)}>Desactivar</button>
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar articulo' : 'Nuevo articulo'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="EQUIPO">Equipo / herramienta</option>
                  <option value="ROPA">Ropa</option>
                  <option value="CONSUMIBLE">Consumible</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fotos</label>
              {modal.editing ? (
                <div className="flex flex-wrap gap-2">
                  {imagenes.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-gray-200">
                      <img src={img.ruta} alt="" className="w-full h-full object-cover" />
                      {img.esPrincipal && (
                        <span className="absolute top-0 left-0 bg-brand-600 text-white text-[10px] px-1 rounded-br">Portada</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                        {!img.esPrincipal && (
                          <button type="button" className="text-white text-[10px]" onClick={() => marcarPrincipal(img.id)}>⭐ Portada</button>
                        )}
                        <button type="button" className="text-white text-[10px]" onClick={() => eliminarImagen(img.id)}>✕ Quitar</button>
                      </div>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 hover:border-brand-400 hover:text-brand-500 text-xs text-center">
                    {subiendoImagen ? '...' : '+ Foto'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSubirImagen} disabled={subiendoImagen} />
                  </label>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Guarda el articulo primero; despues podras subir fotos aqui mismo.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <div className="flex gap-2">
                  <select className="input" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}>
                    <option value="">Sin categoria</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 mt-1">
                  <input className="input text-xs" placeholder="Nueva categoria" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
                  <button type="button" className="btn-secondary text-xs" onClick={handleCrearCategoria}>Agregar</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Codigo de barras</label>
                <input className="input" value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!modal.editing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimo</label>
                <input type="number" className="input" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                <input type="number" step="0.01" className="input" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
                <input type="number" step="0.01" className="input" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.vendible} onChange={(e) => setForm({ ...form, vendible: e.target.checked })} />
              Mostrar en la tienda / catalogo publico
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.reservable} onChange={(e) => setForm({ ...form, reservable: e.target.checked })} />
              Se puede apartar desde la tienda en linea
            </label>
            {form.reservable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento publico por apartado (%, opcional)</label>
                <input type="number" step="0.01" min="0" max="100" className="input" value={form.descuentoApartadoPorcentaje}
                  onChange={(e) => setForm({ ...form, descuentoApartadoPorcentaje: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas relacionadas</label>
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <button type="button" key={d.id} onClick={() => toggleDisciplina(d.id)}
                    className={'px-3 py-1 rounded-full text-xs border ' + (form.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                    {d.icono} {d.nombre}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear articulo'}</button>
          </form>
        </Modal>
      )}

      {modalAjuste && (
        <Modal title={`Ajustar stock — ${modalAjuste.nombre}`} onClose={() => setModalAjuste(null)}>
          <form onSubmit={handleAjuste} className="space-y-3">
            <p className="text-sm text-gray-500">Stock actual: <strong>{modalAjuste.stock}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (usa negativo para restar)</label>
              <input type="number" className="input" value={ajusteDelta} onChange={(e) => setAjusteDelta(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razon</label>
              <input className="input" value={ajusteRazon} onChange={(e) => setAjusteRazon(e.target.value)} placeholder="Compra, perdida, prestamo..." />
            </div>
            <p className="text-sm text-gray-600">Nuevo stock: <strong>{modalAjuste.stock + Number(ajusteDelta || 0)}</strong></p>
            <button className="btn-primary w-full">Aplicar ajuste</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
