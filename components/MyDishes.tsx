import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SavedDish } from '../types';
import { PlusCircleIcon, TrashIcon, EditIcon } from './ui/Icons';

interface MyDishesProps {
    dishes: SavedDish[];
    onAddDish: (dish: Omit<SavedDish, 'id'>) => void;
    onUpdateDish: (id: string, dish: Omit<SavedDish, 'id'>) => void;
    onDeleteDish: (id: string) => void;
}

interface DishFormData {
    name: string;
    calories: string;
    protein: string;
    fat: string;
    carbohydrate: string;
    fiber: string;
}

const MyDishes = ({ dishes, onAddDish, onUpdateDish, onDeleteDish }: MyDishesProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<DishFormData>({
        name: '',
        calories: '',
        protein: '',
        fat: '',
        carbohydrate: '',
        fiber: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const resetForm = () => {
        setFormData({
            name: '',
            calories: '',
            protein: '',
            fat: '',
            carbohydrate: '',
            fiber: '',
        });
        setFormError(null);
        setEditingId(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (dish: SavedDish) => {
        setFormData({
            name: dish.name,
            calories: dish.per100g.calories.toString(),
            protein: dish.per100g.protein.toString(),
            fat: dish.per100g.fat.toString(),
            carbohydrate: dish.per100g.carbohydrate.toString(),
            fiber: dish.per100g.fiber.toString(),
        });
        setEditingId(dish.id);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            setFormError('Введите название блюда');
            return;
        }

        const calories = formData.calories.trim() === '' ? 0 : parseFloat(formData.calories);
        const protein = formData.protein.trim() === '' ? 0 : parseFloat(formData.protein);
        const fat = formData.fat.trim() === '' ? 0 : parseFloat(formData.fat);
        const carbohydrate = formData.carbohydrate.trim() === '' ? 0 : parseFloat(formData.carbohydrate);
        const fiber = formData.fiber.trim() === '' ? 0 : parseFloat(formData.fiber);

        if (isNaN(calories) || isNaN(protein) || isNaN(fat) || isNaN(carbohydrate) || isNaN(fiber)) {
            setFormError('Все поля КБЖУК должны быть числами');
            return;
        }

        if (calories < 0 || protein < 0 || fat < 0 || carbohydrate < 0 || fiber < 0) {
            setFormError('Значения не могут быть отрицательными');
            return;
        }

        const dishData = {
            name: formData.name.trim(),
            per100g: {
                calories: Math.round(calories),
                protein: Number(protein.toFixed(1)),
                fat: Number(fat.toFixed(1)),
                carbohydrate: Number(carbohydrate.toFixed(1)),
                fiber: Number(fiber.toFixed(1)),
            },
        };

        if (editingId) {
            onUpdateDish(editingId, dishData);
        } else {
            onAddDish(dishData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('Удалить это блюдо из справочника?')) {
            onDeleteDish(id);
        }
    };

    return (
        <div className="glass-panel p-4 sm:p-6 space-y-4 w-full animate-fade-up">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold">Мои блюда</h2>
                <button
                    onClick={handleOpenAdd}
                    className="mono-button flex items-center gap-2 text-sm"
                >
                    <PlusCircleIcon /> Добавить
                </button>
            </div>

            {dishes.length === 0 ? (
                <div className="glass-panel p-6 text-center">
                    <p className="mb-2 text-gray-900 font-medium">Справочник пуст</p>
                    <p className="text-sm text-gray-600">Сохраните блюда из конструктора или добавьте вручную</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-sleek pr-1">
                    {dishes.map(dish => (
                        <div key={dish.id} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <h3 className="font-semibold text-base capitalize flex-1">
                                    {dish.name}
                                </h3>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleOpenEdit(dish)}
                                        className="text-indigo-600 hover:text-indigo-700 transition-colors"
                                        title="Редактировать"
                                    >
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dish.id)}
                                        className="text-red-300 hover:text-red-100 transition-colors"
                                        title="Удалить"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2 uppercase tracking-[0.2em] font-medium">КБЖУК на 100г</p>
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                {[
                                    { label: 'Кал', value: dish.per100g.calories, accent: 'text-cyan-200' },
                                    { label: 'Б', value: dish.per100g.protein, accent: 'text-emerald-200' },
                                    { label: 'Ж', value: dish.per100g.fat, accent: 'text-orange-200' },
                                    { label: 'У', value: dish.per100g.carbohydrate, accent: 'text-purple-200' },
                                    { label: 'Кл', value: dish.per100g.fiber, accent: 'text-sky-200' },
                                ].map(item => (
                                    <div key={item.label} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                        <p className="text-gray-600 text-xs">{item.label}</p>
                                        <p className={`font-bold text-base ${item.accent}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && createPortal(
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6"
                    onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                    }}
                >
                    <div 
                        className="bg-white p-6 sm:p-8 w-full max-w-lg sm:max-w-xl space-y-5 rounded-2xl shadow-2xl overflow-y-auto max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                        style={{ margin: 'auto' }}
                    >
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                            {editingId ? 'Редактировать блюдо' : 'Добавить блюдо'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Название блюда</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Например, Куриная грудка"
                                    className="glow-input w-full bg-white text-base py-3"
                                    autoFocus
                                />
                            </div>
                            
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Пищевая ценность на 100г:</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    {([
                                        { key: 'calories', label: 'Калории (ккал)' },
                                        { key: 'protein', label: 'Белки (г)' },
                                        { key: 'fat', label: 'Жиры (г)' },
                                        { key: 'carbohydrate', label: 'Углеводы (г)' },
                                        { key: 'fiber', label: 'Клетчатка (г)', full: true },
                                    ] as Array<{ key: keyof DishFormData; label: string; full?: boolean }>).map(field => (
                                        <div key={field.key} className={field.full ? 'col-span-2' : ''}>
                                            <label className="block text-sm text-gray-600 mb-2">{field.label}</label>
                                            <input
                                                type="number"
                                                value={formData[field.key]}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                placeholder="0"
                                                className="glow-input w-full bg-white text-base py-3"
                                                step="0.1"
                                                min="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {formError && (
                            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{formError}</p>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }}
                                className="mono-button px-5 py-2.5"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSave}
                                className="mono-button primary-cta px-5 py-2.5"
                            >
                                {editingId ? 'Сохранить' : 'Добавить'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MyDishes;
