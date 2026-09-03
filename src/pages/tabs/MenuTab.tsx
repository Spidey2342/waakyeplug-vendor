import { useState, useEffect, useRef } from 'react';
import {
  getMenuItems, addMenuItem, addMenuItems, updateMenuItem, deleteMenuItem, uploadMenuItemImage,
  type Vendor, type MenuItem,
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, X, Loader2, Camera, ImageOff, Wheat, Fish, Salad, CupSoda, Croissant, UtensilsCrossed } from 'lucide-react';

const CATEGORIES: { value: MenuItem['category']; label: string; icon: any; hint: string }[] = [
  { value: 'base', label: 'Size', icon: Wheat, hint: 'e.g. Small / Medium / Large — the base bowl a customer picks one of.' },
  { value: 'protein', label: 'Protein', icon: Fish, hint: 'Add-ons customers can add any quantity of.' },
  { value: 'extra', label: 'Extras', icon: Salad, hint: 'Optional toppings customers can toggle on.' },
  { value: 'drink', label: 'Drinks', icon: CupSoda, hint: 'Breakfast drink options (tea, coffee, etc).' },
  { value: 'breakfast_item', label: 'Breakfast Item', icon: Croissant, hint: 'Add-ons specific to breakfast orders.' },
  { value: 'combo', label: 'Combo / Custom', icon: UtensilsCrossed, hint: 'A standalone item with its own price and photo — not part of a pick-one-of-many group.' },
];

const GROUPED_CATEGORIES: MenuItem['category'][] = ['base', 'protein', 'extra', 'drink', 'breakfast_item'];

function nextGroupedCategory(current: MenuItem['category']): MenuItem['category'] {
  const idx = GROUPED_CATEGORIES.indexOf(current);
  if (idx === -1 || idx === GROUPED_CATEGORIES.length - 1) return current;
  return GROUPED_CATEGORIES[idx + 1];
}

type QuickRow = { name: string; description: string; price: string };
const blankRow = (): QuickRow => ({ name: '', description: '', price: '' });

export default function MenuTab({ vendor }: { vendor: Vendor }) {
  const { toastSuccess, toastError } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<MenuItem['category']>('base');
  const isGrouped = GROUPED_CATEGORIES.includes(category);

  // Grouped-category quick-add: several rows submitted together.
  const [rows, setRows] = useState<QuickRow[]>([blankRow()]);
  const [addingRows, setAddingRows] = useState(false);

  // Combo/custom: single standalone item with its own photo + pricing type.
  const [comboItem, setComboItem] = useState({ name: '', description: '', price: '', pricingType: 'fixed' as 'fixed' | 'variable' });
  const [comboImageFile, setComboImageFile] = useState<File | null>(null);
  const [comboImagePreview, setComboImagePreview] = useState<string | null>(null);
  const comboFileInputRef = useRef<HTMLInputElement>(null);
  const [addingCombo, setAddingCombo] = useState(false);

  const editFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    try {
      const data = await getMenuItems(vendor.id);
      setItems(data);
    } catch (err: any) {
      toastError(err.message || 'Could not load menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [vendor.id]);

  // ── Grouped quick-add (Size / Protein / Extra / Drink / Breakfast Item) ────
  const updateRow = (index: number, field: keyof QuickRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  const removeRow = (index: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleAddRows = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows
      .filter((r) => r.name.trim() && r.price)
      .map((r) => ({ name: r.name.trim(), description: r.description.trim() || null, price: Number(r.price) }));

    if (validRows.length === 0) return;

    setAddingRows(true);
    try {
      const created = await addMenuItems(vendor.id, category, validRows);
      setItems((prev) => [...prev, ...created]);
      setRows([blankRow()]);
      // Stay open and jump to the next category in the natural sequence
      // (Size → Protein → Extra → ...) so a vendor can keep going without
      // reopening the form each time. They can still jump anywhere via the
      // checklist below.
      setCategory((c) => nextGroupedCategory(c));
      toastSuccess(`Added ${created.length} item${created.length !== 1 ? 's' : ''} to your menu.`);
    } catch (err: any) {
      toastError(err.message || 'Could not add items.');
    } finally {
      setAddingRows(false);
    }
  };

  // ── Combo/custom single-item add ────────────────────────────────────────────
  const handleComboImagePick = (file: File | undefined) => {
    if (!file) return;
    setComboImageFile(file);
    setComboImagePreview(URL.createObjectURL(file));
  };

  const handleAddCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboItem.name.trim() || !comboItem.price) return;
    setAddingCombo(true);
    try {
      const created = await addMenuItem({
        vendorId: vendor.id,
        category: 'combo',
        name: comboItem.name,
        description: comboItem.description.trim() || null,
        price: Number(comboItem.price),
        pricingType: comboItem.pricingType,
      });

      let finalItem = created;
      if (comboImageFile) {
        const imageUrl = await uploadMenuItemImage(vendor.id, comboImageFile);
        finalItem = await updateMenuItem(created.id, { image_url: imageUrl });
      }

      setItems((prev) => [...prev, finalItem]);
      setComboItem({ name: '', description: '', price: '', pricingType: 'fixed' });
      setComboImageFile(null);
      setComboImagePreview(null);
      toastSuccess(`"${finalItem.name}" added to your menu.`);
    } catch (err: any) {
      toastError(err.message || 'Could not add item.');
    } finally {
      setAddingCombo(false);
    }
  };

  // ── Shared item management ──────────────────────────────────────────────────
  const toggleAvailable = async (item: MenuItem) => {
    setSavingId(item.id);
    try {
      const updated = await updateMenuItem(item.id, { is_available: !item.is_available });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      toastError(err.message || 'Could not update item.');
    } finally {
      setSavingId(null);
    }
  };

  const updatePrice = async (item: MenuItem, price: string) => {
    if (!price || Number(price) === item.price) return;
    setSavingId(item.id);
    try {
      const updated = await updateMenuItem(item.id, { price: Number(price) });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      toastSuccess(`"${item.name}" price updated.`);
    } catch (err: any) {
      toastError(err.message || 'Could not update price.');
    } finally {
      setSavingId(null);
    }
  };

  const updateDescription = async (item: MenuItem, description: string) => {
    if (description === (item.description ?? '')) return;
    setSavingId(item.id);
    try {
      const updated = await updateMenuItem(item.id, { description: description.trim() || null });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      toastError(err.message || 'Could not update description.');
    } finally {
      setSavingId(null);
    }
  };

  const handleReplaceImage = async (item: MenuItem, file: File | undefined) => {
    if (!file) return;
    setUploadingId(item.id);
    try {
      const imageUrl = await uploadMenuItemImage(vendor.id, file);
      const updated = await updateMenuItem(item.id, { image_url: imageUrl });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      toastSuccess('Photo updated.');
    } catch (err: any) {
      toastError(err.message || 'Could not upload photo.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!window.confirm(`Remove "${item.name}" from your menu?`)) return;
    setSavingId(item.id);
    try {
      await deleteMenuItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toastSuccess(`"${item.name}" removed.`);
    } catch (err: any) {
      toastError(err.message || 'Could not remove item.');
    } finally {
      setSavingId(null);
    }
  };

  const activeHint = CATEGORIES.find((c) => c.value === category)?.hint;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Add a whole group at once — all your sizes together, all your proteins together — or add a standalone combo item on its own.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus size={16} /> Add Item{isGrouped ? 's' : ''}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          {/* Progress checklist — jump to any category, see what's covered */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.value !== 'combo').map((c) => {
              const hasItems = items.some((i) => i.category === c.value);
              const isActive = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition
                    ${isActive ? 'bg-orange-600 border-orange-600 text-white' : hasItems ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  {hasItems ? '✓ ' : ''}{c.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 ml-auto hover:bg-gray-50 transition"
            >
              Done for now
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MenuItem['category'])}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {activeHint && <p className="text-xs text-gray-400 mt-1">{activeHint}</p>}
          </div>

          {isGrouped ? (
            // ── Grouped quick-add: several name+price rows in one submission ──
            <form onSubmit={handleAddRows} className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2">
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                    placeholder={category === 'base' ? 'e.g. Medium' : 'e.g. Egg'}
                    className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                  />
                  <input
                    value={row.description}
                    onChange={(e) => updateRow(i, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                  />
                  <input
                    type="number"
                    value={row.price}
                    onChange={(e) => updateRow(i, 'price', e.target.value)}
                    placeholder="GHS"
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-30 p-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                className="self-start flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <Plus size={14} /> Add another row
              </button>

              <button
                type="submit"
                disabled={addingRows}
                className="self-start flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                {addingRows ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {addingRows ? 'Adding...' : `Add ${rows.filter((r) => r.name.trim() && r.price).length || ''} to Menu`}
              </button>
            </form>
          ) : (
            // ── Combo/custom: single standalone item with photo ──────────────────
            <form onSubmit={handleAddCombo} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="shrink-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Photo</label>
                  <button
                    type="button"
                    onClick={() => comboFileInputRef.current?.click()}
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 flex items-center justify-center overflow-hidden bg-gray-50 transition"
                  >
                    {comboImagePreview ? (
                      <img src={comboImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Camera size={22} />
                        <span className="text-[10px] mt-1">Add Photo</span>
                      </div>
                    )}
                  </button>
                  <input ref={comboFileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleComboImagePick(e.target.files?.[0])} />
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
                      <input
                        value={comboItem.name}
                        onChange={(e) => setComboItem({ ...comboItem, name: e.target.value })}
                        placeholder="e.g. Waakye Special"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description <span className="text-gray-300">(optional)</span>
                      </label>
                      <input
                        value={comboItem.description}
                        onChange={(e) => setComboItem({ ...comboItem, description: e.target.value })}
                        placeholder="Optional note"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Pricing</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setComboItem({ ...comboItem, pricingType: 'fixed' })}
                        className={`flex-1 text-sm font-medium py-2 rounded-lg border transition
                          ${comboItem.pricingType === 'fixed' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        Fixed Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setComboItem({ ...comboItem, pricingType: 'variable' })}
                        className={`flex-1 text-sm font-medium py-2 rounded-lg border transition
                          ${comboItem.pricingType === 'variable' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        Starting From
                      </button>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={comboItem.price}
                        onChange={(e) => setComboItem({ ...comboItem, price: e.target.value })}
                        placeholder="GHS"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={addingCombo}
                className="self-start flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                {addingCombo ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {addingCombo ? 'Adding...' : 'Add to Menu'}
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading menu...</p>
      ) : (
        CATEGORIES.map(({ value, label, icon: CatIcon }) => {
          const categoryItems = items.filter((i) => i.category === value);
          if (categoryItems.length === 0) return null;
          return (
            <div key={value}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon size={16} className="text-orange-600" />
                <h2 className="font-bold text-gray-900 text-sm">{label}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="relative h-32 bg-gray-50">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <ImageOff size={24} />
                          <span className="text-[10px] mt-1">No photo yet</span>
                        </div>
                      )}
                      <button
                        onClick={() => editFileInputRefs.current[item.id]?.click()}
                        disabled={uploadingId === item.id}
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-gray-700 hover:bg-white transition disabled:opacity-50"
                      >
                        {uploadingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      </button>
                      <input
                        ref={(el) => { editFileInputRefs.current[item.id] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleReplaceImage(item, e.target.files?.[0])}
                      />
                    </div>
                    <div className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                        <button onClick={() => handleDelete(item)} disabled={savingId === item.id} className="text-gray-300 hover:text-red-500 disabled:opacity-50 transition shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        type="text"
                        defaultValue={item.description ?? ''}
                        placeholder="Add a short description..."
                        onBlur={(e) => updateDescription(item, e.target.value)}
                        className="w-full text-xs text-gray-500 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:border-orange-600"
                      />

                      <div className="flex items-center gap-2">
                        {item.pricing_type === 'variable' && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">FROM</span>}
                        <span className="text-xs text-gray-400">GHS</span>
                        <input
                          type="number"
                          defaultValue={item.price}
                          onBlur={(e) => updatePrice(item, e.target.value)}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-orange-600"
                        />
                      </div>

                      <button
                        onClick={() => toggleAvailable(item)}
                        disabled={savingId === item.id}
                        className={`w-full text-xs font-semibold py-1.5 rounded-full transition disabled:opacity-50
                          ${item.is_available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {savingId === item.id ? <Loader2 size={12} className="animate-spin inline" /> : item.is_available ? 'Available' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {!loading && items.length === 0 && !showAddForm && (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
          <UtensilsCrossed size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Your menu is empty. Add your sizes, proteins, and extras as groups — or add a combo item on its own.
          </p>
        </div>
      )}
    </div>
  );
}