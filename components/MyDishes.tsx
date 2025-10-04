import { useState } from 'react';
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
        <div className="bg-white p-2 sm:p-3 lg:p-4 rounded-lg shadow-md w-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold">Мои блюда</h2>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors"
                >
                    <PlusCircleIcon /> Добавить
                </button>
            </div>

            {dishes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                    <p className="mb-2">Справочник пуст</p>
                    <p className="text-sm">Сохраните блюда из конструктора или добавьте вручную</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {dishes.map(dish => (
                        <div key={dish.id} className="p-3 bg-slate-50 rounded-md border border-slate-200">
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <h3 className="font-semibold text-sm sm:text-base capitalize flex-1">
                                    {dish.name}
                                </h3>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleOpenEdit(dish)}
                                        className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                                        title="Редактировать"
                                    >
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dish.id)}
                                        className="text-red-600 hover:text-red-800 p-1 transition-colors"
                                        title="Удалить"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mb-1">КБЖУК на 100г:</p>
                            <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                <div className="bg-white p-1 rounded">
                                    <p className="text-slate-500">Кал</p>
                                    <p className="font-bold text-blue-600">{dish.per100g.calories}</p>
                                </div>
                                <div className="bg-white p-1 rounded">
                                    <p className="text-slate-500">Б</p>
                                    <p className="font-bold text-green-600">{dish.per100g.protein}</p>
                                </div>
                                <div className="bg-white p-1 rounded">
                                    <p className="text-slate-500">Ж</p>
                                    <p className="font-bold text-orange-600">{dish.per100g.fat}</p>
                                </div>
                                <div className="bg-white p-1 rounded">
                                    <p className="text-slate-500">У</p>
                                    <p className="font-bold text-purple-600">{dish.per100g.carbohydrate}</p>
                                </div>
                                <div className="bg-white p-1 rounded">
                                    <p className="text-slate-500">Кл</p>
                                    <p className="font-bold text-cyan-600">{dish.per100g.fiber}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">
                            {editingId ? 'Редактировать блюдо' : 'Добавить блюдо'}
                        </h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Название</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Например, Куриная грудка"
                                    className="w-full p-2 border border-slate-300 rounded-md"
                                    autoFocus
                                />
                            </div>
                            
                            <div className="border-t pt-3">
                                <p className="text-sm font-medium mb-2">Пищевая ценность на 100г:</p>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Калории (ккал)</label>
                                        <input
                                            type="number"
                                            value={formData.calories}
                                            onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                                            placeholder="0"
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Белки (г)</label>
                                        <input
                                            type="number"
                                            value={formData.protein}
                                            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                                            placeholder="0"
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Жиры (г)</label>
                                        <input
                                            type="number"
                                            value={formData.fat}
                                            onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                                            placeholder="0"
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Углеводы (г)</label>
                                        <input
                                            type="number"
                                            value={formData.carbohydrate}
                                            onChange={(e) => setFormData({ ...formData, carbohydrate: e.target.value })}
                                            placeholder="0"
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-600 mb-1">Клетчатка (г)</label>
                                        <input
                                            type="number"
                                            value={formData.fiber}
                                            onChange={(e) => setFormData({ ...formData, fiber: e.target.value })}
                                            placeholder="0"
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {formError && (
                            <p className="text-red-600 text-sm mt-3">{formError}</p>
                        )}

                        <div className="flex gap-2 justify-end mt-4">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                            >
                                {editingId ? 'Сохранить' : 'Добавить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyDishes;
