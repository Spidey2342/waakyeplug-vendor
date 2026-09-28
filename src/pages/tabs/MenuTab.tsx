import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getMenuItems, addMenuItem, addMenuItems, updateMenuItem, deleteMenuItem, uploadMenuItemImage,
  type Vendor, type MenuItem,
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, X, Loader2, Camera, ImageOff, Wheat, Fish, Salad, CupSoda, Croissant, UtensilsCrossed, ChevronRight } from 'lucide-react';

type ModifierCategory = 'base' | 'protein' | 'extra' | 'drink' | 'breakfast_item';

type GroupSettings = {
  required: boolean;
  selection: 'single' | 'multiple';
  priceMode: 'flat' | 'adjustment';
};

type BaseDishDraft = {
  name: string;
  description: string;
  basePrice: string;
  imageUrl: string | null;
};

const MODIFIER_GROUPS: { value: ModifierCategory; label: string; icon: typeof Wheat; hint: string }[] = [
  { value: 'base', label: 'Size', icon: Wheat, hint: 'Sizes for this dish — each option needs its own price or add-on amount.' },
  { value: 'protein', label: 'Protein', icon: Fish, hint: 'Proteins customers can add to this dish.' },
  { value: 'extra', label: 'Extras', icon: Salad, hint: 'Optional toppings for this dish.' },
  { value: 'drink', label: 'Drinks', icon: CupSoda, hint: 'Drink options offered with this dish.' },
  { value: 'breakfast_item', label: 'Breakfast Item', icon: Croissant, hint: 'Breakfast-specific add-ons for this dish.' },
];

const DEFAULT_GROUP_SETTINGS: Record<ModifierCategory, GroupSettings> = {
  base: { required: true, selection: 'single', priceMode: 'adjustment' },
  protein: { required: false, selection: 'multiple', priceMode: 'adjustment' },
  extra: { required: false, selection: 'multiple', priceMode: 'adjustment' },
  drink: { required: false, selection: 'single', priceMode: 'flat' },
  breakfast_item: { required: false, selection: 'multiple', priceMode: 'adjustment' },
};

const COMBO_CATEGORY: MenuItem['category'] = 'combo';

function baseDishStorageKey(vendorId: string) {
  return `waakye_vendor_base_dish_${vendorId}`;
}

function groupSettingsStorageKey(vendorId: string) {
  return `waakye_vendor_modifier_group_settings_${vendorId}`;
}

function loadBaseDish(vendorId: string): BaseDishDraft | null {
  try {
    const raw = localStorage.getItem(baseDishStorageKey(vendorId));
    if (!raw) return null;
    return JSON.parse(raw) as BaseDishDraft;
  } catch {
    return null;
  }
}

function saveBaseDish(vendorId: string, dish: BaseDishDraft) {
  localStorage.setItem(baseDishStorageKey(vendorId), JSON.stringify(dish));
}

function loadGroupSettings(vendorId: string): Record<ModifierCategory, GroupSettings> {
  try {
    const raw = localStorage.getItem(groupSettingsStorageKey(vendorId));
    if (!raw) return { ...DEFAULT_GROUP_SETTINGS };
    return { ...DEFAULT_GROUP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_GROUP_SETTINGS };
  }
}

function saveGroupSettings(vendorId: string, settings: Record<ModifierCategory, GroupSettings>) {
  localStorage.setItem(groupSettingsStorageKey(vendorId), JSON.stringify(settings));
}

function nextModifierStep(current: ModifierCategory): ModifierCategory {
  const idx = MODIFIER_GROUPS.findIndex((g) => g.value === current);
  if (idx === -1 || idx === MODIFIER_GROUPS.length - 1) return current;
  return MODIFIER_GROUPS[idx + 1].value;
}

type AddFlowType = 'customizable' | 'fixed';
/** `dish` = name/photo/base price; modifier steps use ModifierCategory (e.g. `base` = Size). */
type CustomizableStep = 'dish' | ModifierCategory;

type QuickRow = { name: string; description: string; price: string };
const blankRow = (): QuickRow => ({ name: '', description: '', price: '' });

export default function MenuTab({ vendor }: { vendor: Vendor }) {
  const { toastSuccess, toastError } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFlowType, setAddFlowType] = useState<AddFlowType | null>(null);
  const [customizableStep, setCustomizableStep] = useState<CustomizableStep>('dish');

  const [baseDish, setBaseDish] = useState<BaseDishDraft>({ name: '', description: '', basePrice: '', imageUrl: null });
  const [baseDishImageFile, setBaseDishImageFile] = useState<File | null>(null);
  const [baseDishImagePreview, setBaseDishImagePreview] = useState<string | null>(null);
  const [savingBaseDish, setSavingBaseDish] = useState(false);
  const baseDishFileInputRef = useRef<HTMLInputElement>(null);

  const [groupSettings, setGroupSettings] = useState<Record<ModifierCategory, GroupSettings>>(() => loadGroupSettings(vendor.id));
  const [modifierCategory, setModifierCategory] = useState<ModifierCategory>('base');

  const [rows, setRows] = useState<QuickRow[]>([blankRow()]);
  const [addingRows, setAddingRows] = useState(false);

  const [comboItem, setComboItem] = useState({ name: '', description: '', price: '' });
  const [comboImageFile, setComboImageFile] = useState<File | null>(null);
  const [comboImagePreview, setComboImagePreview] = useState<string | null>(null);
  const comboFileInputRef = useRef<HTMLInputElement>(null);
  const [addingCombo, setAddingCombo] = useState(false);

  const editFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshBaseDishFromStorage = useCallback(() => {
    const stored = loadBaseDish(vendor.id);
    if (stored) {
      setBaseDish(stored);
      setBaseDishImagePreview(stored.imageUrl);
    }
  }, [vendor.id]);

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

  useEffect(() => {
    refreshBaseDishFromStorage();
    setGroupSettings(loadGroupSettings(vendor.id));
  }, [vendor.id, refreshBaseDishFromStorage]);

  const storedBaseDish = loadBaseDish(vendor.id);
  const hasBaseDish = Boolean(storedBaseDish?.name.trim() && storedBaseDish?.basePrice && storedBaseDish?.imageUrl);

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddFlowType(null);
    setCustomizableStep('dish');
    setModifierCategory('base');
    setRows([blankRow()]);
    setComboItem({ name: '', description: '', price: '' });
    setComboImageFile(null);
    setComboImagePreview(null);
    const stored = loadBaseDish(vendor.id);
    if (stored) {
      setBaseDish(stored);
      setBaseDishImagePreview(stored.imageUrl);
    } else {
      setBaseDish({ name: '', description: '', basePrice: '', imageUrl: null });
      setBaseDishImagePreview(null);
    }
    setBaseDishImageFile(null);
  };

  const openAddForm = () => {
    setShowAddForm(true);
    setAddFlowType(null);
    setCustomizableStep('base');
    refreshBaseDishFromStorage();
  };

  const updateGroupSetting = <K extends keyof GroupSettings>(
    category: ModifierCategory,
    key: K,
    value: GroupSettings[K],
  ) => {
    setGroupSettings((prev) => {
      const next = { ...prev, [category]: { ...prev[category], [key]: value } };
      saveGroupSettings(vendor.id, next);
      return next;
    });
  };

  const handleBaseDishImagePick = (file: File | undefined) => {
    if (!file) return;
    setBaseDishImageFile(file);
    setBaseDishImagePreview(URL.createObjectURL(file));
  };

  const handleSaveBaseDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseDish.name.trim() || !baseDish.basePrice) {
      toastError('Enter a dish name and base price.');
      return;
    }
    if (!baseDishImagePreview && !baseDish.imageUrl) {
      toastError('Add a photo for this dish.');
      return;
    }

    setSavingBaseDish(true);
    try {
      let imageUrl = baseDish.imageUrl;
      if (baseDishImageFile) {
        imageUrl = await uploadMenuItemImage(vendor.id, baseDishImageFile);
      }
      if (!imageUrl) {
        toastError('Add a photo for this dish.');
        return;
      }

      const saved: BaseDishDraft = {
        name: baseDish.name.trim(),
        description: baseDish.description.trim(),
        basePrice: baseDish.basePrice,
        imageUrl,
      };
      saveBaseDish(vendor.id, saved);
      setBaseDish(saved);
      setBaseDishImagePreview(imageUrl);
      setBaseDishImageFile(null);
      setCustomizableStep('base');
      setModifierCategory('base');
      toastSuccess(`"${saved.name}" is set as your customizable base dish. Continue with Size options.`);
    } catch (err: any) {
      toastError(err.message || 'Could not save base dish.');
    } finally {
      setSavingBaseDish(false);
    }
  };

  const updateRow = (index: number, field: keyof QuickRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  const removeRow = (index: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleAddRows = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBaseDish) {
      toastError('Save your base dish (name, photo, base price) before adding modifier options.');
      setCustomizableStep('dish');
      return;
    }

    const validRows = rows
      .filter((r) => r.name.trim() && r.price !== '')
      .map((r) => ({ name: r.name.trim(), description: r.description.trim() || null, price: Number(r.price) }));

    if (validRows.length === 0) return;

    setAddingRows(true);
    try {
      const created = await addMenuItems(vendor.id, modifierCategory, validRows);
      setItems((prev) => [...prev, ...created]);
      setRows([blankRow()]);
      const next = nextModifierStep(modifierCategory);
      setModifierCategory(next);
      setCustomizableStep(next);
      toastSuccess(`Added ${created.length} option${created.length !== 1 ? 's' : ''} under ${MODIFIER_GROUPS.find((g) => g.value === modifierCategory)?.label}.`);
    } catch (err: any) {
      toastError(err.message || 'Could not add items.');
    } finally {
      setAddingRows(false);
    }
  };

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
        category: COMBO_CATEGORY,
        name: comboItem.name,
        description: comboItem.description.trim() || null,
        price: Number(comboItem.price),
        pricingType: 'fixed',
      });

      let finalItem = created;
      if (comboImageFile) {
        const imageUrl = await uploadMenuItemImage(vendor.id, comboImageFile);
        finalItem = await updateMenuItem(created.id, { image_url: imageUrl });
      }

      setItems((prev) => [...prev, finalItem]);
      setComboItem({ name: '', description: '', price: '' });
      setComboImageFile(null);
      setComboImagePreview(null);
      toastSuccess(`"${finalItem.name}" added as a fixed menu item.`);
    } catch (err: any) {
      toastError(err.message || 'Could not add item.');
    } finally {
      setAddingCombo(false);
    }
  };

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

  const modifierItems = items.filter((i) => i.category !== COMBO_CATEGORY);
  const comboItems = items.filter((i) => i.category === COMBO_CATEGORY);
  const activeGroup = MODIFIER_GROUPS.find((g) => g.value === modifierCategory);
  const activeGroupSettings = groupSettings[modifierCategory];
  const priceFieldLabel = activeGroupSettings.priceMode === 'adjustment'
    ? 'Add to base (+GHS)'
    : 'Price (GHS)';

  const renderItemCard = (item: MenuItem) => (
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
  );

  const renderGroupSettingsPanel = (category: ModifierCategory) => {
    const settings = groupSettings[category];
    const groupMeta = MODIFIER_GROUPS.find((g) => g.value === category)!;
    return (
      <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-700">{groupMeta.label} group settings</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Required?</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'required', true)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${settings.required ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                Required
              </button>
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'required', false)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${!settings.required ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                Optional
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Customer picks</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'selection', 'single')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${settings.selection === 'single' ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                One only
              </button>
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'selection', 'multiple')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${settings.selection === 'multiple' ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                Multiple
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Option pricing</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'priceMode', 'adjustment')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${settings.priceMode === 'adjustment' ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                + Base
              </button>
              <button
                type="button"
                onClick={() => updateGroupSetting(category, 'priceMode', 'flat')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition
                  ${settings.priceMode === 'flat' ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                Flat price
              </button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-500">
          {settings.priceMode === 'adjustment'
            ? `Each option adds to the base dish price (GHS ${storedBaseDish?.basePrice ?? '—'}). Use 0 for no extra charge.`
            : 'Each option uses its own full price — not added on top of the base dish price.'}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Start by choosing what kind of item you are adding — a customizable dish customers build, or a fixed combo at one price.
          </p>
        </div>
        <button
          onClick={() => (showAddForm ? resetAddForm() : openAddForm())}
          className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          {!addFlowType && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-800">What are you adding?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setAddFlowType('customizable'); setCustomizableStep('dish'); }}
                  className="text-left rounded-xl border border-gray-200 hover:border-orange-400 p-4 transition bg-gray-50 hover:bg-orange-50/30"
                >
                  <p className="text-sm font-bold text-gray-900">Customizable Item</p>
                  <p className="text-xs text-gray-500 mt-1">Customer builds it — size, protein, extras, drinks, and more.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAddFlowType('fixed')}
                  className="text-left rounded-xl border border-gray-200 hover:border-orange-400 p-4 transition bg-gray-50 hover:bg-orange-50/30"
                >
                  <p className="text-sm font-bold text-gray-900">Fixed Combo / Single Item</p>
                  <p className="text-xs text-gray-500 mt-1">One fixed dish at one fixed price — no customization (e.g. Waakye Plug special).</p>
                </button>
              </div>
              <button
                type="button"
                onClick={resetAddForm}
                className="self-start text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {addFlowType === 'fixed' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Fixed Combo / Single Item</p>
                <button type="button" onClick={() => setAddFlowType(null)} className="text-xs text-gray-500 hover:text-gray-700">Change type</button>
              </div>
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
                          placeholder="e.g. Waakye Plug Special"
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
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fixed price (GHS)</label>
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
            </>
          )}

          {addFlowType === 'customizable' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAddFlowType(null)} className="text-xs text-gray-500 hover:text-gray-700">Change type</button>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs font-semibold text-gray-600">Customizable item</span>
                {hasBaseDish && storedBaseDish && (
                  <>
                    <ChevronRight size={12} className="text-gray-300" />
                    <span className="text-xs font-semibold text-orange-700">{storedBaseDish.name}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={resetAddForm}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 ml-auto hover:bg-gray-50 transition"
                >
                  Done for now
                </button>
              </div>

              {/* Step 1: Base dish — always first; modifier tabs locked until complete */}
              <div className={`rounded-xl border p-4 flex flex-col gap-3 ${customizableStep === 'dish' ? 'border-orange-300 bg-orange-50/20' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${hasBaseDish ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {hasBaseDish ? '✓ Base dish' : '1. Base dish'}
                  </span>
                  <p className="text-xs text-gray-500">Name, photo, and starting price — modifier groups apply to this dish.</p>
                </div>

                {customizableStep === 'dish' && (
                  <form onSubmit={handleSaveBaseDish} className="flex flex-col sm:flex-row gap-4">
                    <div className="shrink-0">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Photo</label>
                      <button
                        type="button"
                        onClick={() => baseDishFileInputRef.current?.click()}
                        className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 flex items-center justify-center overflow-hidden bg-gray-50 transition"
                      >
                        {baseDishImagePreview ? (
                          <img src={baseDishImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400">
                            <Camera size={22} />
                            <span className="text-[10px] mt-1">Add Photo</span>
                          </div>
                        )}
                      </button>
                      <input ref={baseDishFileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleBaseDishImagePick(e.target.files?.[0])} />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Dish name</label>
                          <input
                            value={baseDish.name}
                            onChange={(e) => setBaseDish({ ...baseDish, name: e.target.value })}
                            placeholder="e.g. Waakye"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Base price (GHS)</label>
                          <input
                            type="number"
                            value={baseDish.basePrice}
                            onChange={(e) => setBaseDish({ ...baseDish, basePrice: e.target.value })}
                            placeholder="Starting price"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description <span className="text-gray-300">(optional)</span></label>
                        <input
                          value={baseDish.description}
                          onChange={(e) => setBaseDish({ ...baseDish, description: e.target.value })}
                          placeholder="Short description for customers"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingBaseDish}
                        className="self-start flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
                      >
                        {savingBaseDish ? <Loader2 size={15} className="animate-spin" /> : null}
                        {savingBaseDish ? 'Saving...' : hasBaseDish ? 'Update base dish' : 'Save base dish & continue'}
                      </button>
                    </div>
                  </form>
                )}

                {customizableStep !== 'dish' && storedBaseDish && (
                  <div className="flex items-center gap-3">
                    {storedBaseDish.imageUrl && (
                      <img src={storedBaseDish.imageUrl} alt={storedBaseDish.name} className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{storedBaseDish.name}</p>
                      <p className="text-xs text-gray-500">Base price: GHS {storedBaseDish.basePrice}</p>
                    </div>
                    <button type="button" onClick={() => setCustomizableStep('dish')} className="text-xs font-medium text-orange-600 hover:text-orange-700 ml-auto">
                      Edit base dish
                    </button>
                  </div>
                )}
              </div>

              {/* Modifier groups — nested under base dish, fixed order */}
              {hasBaseDish && (
                <div className="flex flex-col gap-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-orange-100">
                  <div className="flex flex-wrap gap-2">
                    {MODIFIER_GROUPS.map((g) => {
                      const hasItems = items.some((i) => i.category === g.value);
                      const isActive = customizableStep !== 'dish' && modifierCategory === g.value && customizableStep === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => { setCustomizableStep(g.value); setModifierCategory(g.value); }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition
                            ${isActive ? 'bg-orange-600 border-orange-600 text-white' : hasItems ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                        >
                          {hasItems ? '✓ ' : ''}{g.label}
                        </button>
                      );
                    })}
                  </div>

                  {customizableStep !== 'dish' && activeGroup && customizableStep === modifierCategory && (
                    <>
                      <p className="text-xs text-gray-400">{activeGroup.hint}</p>
                      {renderGroupSettingsPanel(modifierCategory)}

                      <form onSubmit={handleAddRows} className="flex flex-col gap-3">
                        {rows.map((row, i) => (
                          <div key={i} className="flex flex-wrap items-end gap-2">
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Option name</label>
                              <input
                                value={row.name}
                                onChange={(e) => updateRow(i, 'name', e.target.value)}
                                placeholder={modifierCategory === 'base' ? 'e.g. Medium' : 'e.g. Egg'}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                              />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Description (optional)</label>
                              <input
                                value={row.description}
                                onChange={(e) => updateRow(i, 'description', e.target.value)}
                                placeholder="Optional"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">{priceFieldLabel}</label>
                              <input
                                type="number"
                                value={row.price}
                                onChange={(e) => updateRow(i, 'price', e.target.value)}
                                placeholder={activeGroupSettings.priceMode === 'adjustment' ? '+0' : 'GHS'}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-600"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              disabled={rows.length === 1}
                              className="text-gray-300 hover:text-red-500 disabled:opacity-30 p-2 mb-0.5"
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
                          <Plus size={14} /> Add another option
                        </button>

                        <button
                          type="submit"
                          disabled={addingRows}
                          className="self-start flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
                        >
                          {addingRows ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                          {addingRows ? 'Adding...' : `Add ${rows.filter((r) => r.name.trim() && r.price !== '').length || ''} to ${activeGroup.label}`}
                        </button>
                      </form>
                    </>
                  )}

                  {customizableStep === 'dish' && hasBaseDish && (
                    <button
                      type="button"
                      onClick={() => { setCustomizableStep('base'); setModifierCategory('base'); }}
                      className="self-start text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Continue to Size →
                    </button>
                  )}
                </div>
              )}

              {!hasBaseDish && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Save your base dish first. Size, Protein, Extras, and Drinks are added only after the dish name, photo, and base price are set.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading menu...</p>
      ) : (
        <>
          {(modifierItems.length > 0 || storedBaseDish) && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <Wheat size={16} className="text-orange-600" />
                <h2 className="font-bold text-gray-900 text-sm">Customizable dish</h2>
              </div>

              {storedBaseDish && (
                <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex gap-4">
                  {storedBaseDish.imageUrl ? (
                    <img src={storedBaseDish.imageUrl} alt={storedBaseDish.name} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
                      <ImageOff size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900">{storedBaseDish.name}</p>
                    {storedBaseDish.description && <p className="text-xs text-gray-500 mt-0.5">{storedBaseDish.description}</p>}
                    <p className="text-sm font-semibold text-orange-700 mt-2">Base price: GHS {storedBaseDish.basePrice}</p>
                  </div>
                </div>
              )}

              {MODIFIER_GROUPS.map(({ value, label, icon: CatIcon }) => {
                const categoryItems = modifierItems.filter((i) => i.category === value);
                if (categoryItems.length === 0) return null;
                const settings = groupSettings[value];
                return (
                  <div key={value} className="ml-0 sm:ml-6 border-l-0 sm:border-l-2 border-orange-50 pl-0 sm:pl-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <CatIcon size={16} className="text-orange-600" />
                      <h3 className="font-bold text-gray-900 text-sm">{label}</h3>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {settings.required ? 'Required' : 'Optional'} · {settings.selection === 'single' ? 'Pick one' : 'Pick multiple'} · {settings.priceMode === 'adjustment' ? '+ base' : 'Flat price'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryItems.map(renderItemCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {comboItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed size={16} className="text-orange-600" />
                <h2 className="font-bold text-gray-900 text-sm">Fixed Combos & Single Items</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {comboItems.map(renderItemCard)}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && items.length === 0 && !storedBaseDish && !showAddForm && (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
          <UtensilsCrossed size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Your menu is empty. Choose a customizable dish or a fixed combo to get started.
          </p>
        </div>
      )}
    </div>
  );
}
