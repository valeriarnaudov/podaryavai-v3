import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, Save, X, Edit2, Plus } from 'lucide-react';

interface EmailTemplate {
    id: string;
    name: string;
    trigger_days: number;
    subject: string;
    body_html: string;
    is_active: boolean;
    created_at?: string;
}

export default function AdminEmails() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [saving, setSaving] = useState(false);
    const [isNew, setIsNew] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .order('trigger_days', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            alert('Сгрешка при зареждане на шаблоните.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        try {
            setSaving(true);
            const payload = {
                name: editingTemplate.name,
                trigger_days: editingTemplate.trigger_days,
                subject: editingTemplate.subject,
                body_html: editingTemplate.body_html,
                is_active: editingTemplate.is_active
            };

            if (isNew) {
                const { error } = await supabase.from('email_templates').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('email_templates')
                    .update(payload)
                    .eq('id', editingTemplate.id);
                if (error) throw error;
            }

            setEditingTemplate(null);
            setIsNew(false);
            fetchTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Грешка при запис на шаблона.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (template: EmailTemplate) => {
        try {
            const { error } = await supabase
                .from('email_templates')
                .update({ is_active: !template.is_active })
                .eq('id', template.id);

            if (error) throw error;
            setTemplates(templates.map(t => 
                t.id === template.id ? { ...t, is_active: !t.is_active } : t
            ));
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Грешка при промяна на статуса.');
        }
    };

    const openNewForm = () => {
        setEditingTemplate({
            id: 'new',
            name: 'Нов шаблон',
            trigger_days: 1,
            subject: '',
            body_html: '',
            is_active: true
        });
        setIsNew(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Email Шаблони</h1>
                    <p className="text-slate-500 mt-1">
                        Управление на автоматичните имейли за предстоящи събития.
                    </p>
                </div>
                {!editingTemplate && (
                    <button 
                        onClick={openNewForm}
                        className="btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Създай нов
                    </button>
                )}
            </div>

            {editingTemplate ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-textMain">
                            {isNew ? 'Създаване на шаблон' : 'Редактиране на шаблон'}
                        </h2>
                        <button 
                            onClick={() => { setEditingTemplate(null); setIsNew(false); }}
                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-textMain mb-2">
                                    Име (вътрешно)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingTemplate.name}
                                    onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-textMain mb-2">
                                    Дни предварително
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={editingTemplate.trigger_days}
                                    onChange={e => setEditingTemplate({...editingTemplate, trigger_days: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">Остават X дни до повода (0 = На самия ден)</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-textMain mb-2">
                                Заглавие (Subject)
                            </label>
                            <input
                                type="text"
                                required
                                value={editingTemplate.subject}
                                onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-textMain mb-2">
                                HTML Съдържание (Body)
                            </label>
                            <div className="bg-slate-50 p-3 rounded-lg mb-3 text-sm text-slate-600 border border-slate-100">
                                <strong>Достъпни променливи:</strong><br/>
                                <span className="font-mono bg-white px-1 py-0.5 rounded text-xs border border-slate-200 mr-2">{`{{userName}}`}</span> Име на потребителя<br/>
                                <span className="font-mono bg-white px-1 py-0.5 rounded text-xs border border-slate-200 mr-2">{`{{contactName}}`}</span> Име на приятеля<br/>
                                <span className="font-mono bg-white px-1 py-0.5 rounded text-xs border border-slate-200 mr-2">{`{{eventTitle}}`}</span> Заглавие на събитието (Рожден ден)<br/>
                                <span className="font-mono bg-white px-1 py-0.5 rounded text-xs border border-slate-200 mr-2">{`{{daysLeft}}`}</span> Дни до събитието
                            </div>
                            <textarea
                                required
                                rows={15}
                                value={editingTemplate.body_html}
                                onChange={e => setEditingTemplate({...editingTemplate, body_html: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-mono text-sm leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={editingTemplate.is_active}
                                onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                                className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                            />
                            <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-textMain">
                                Активен шаблон (ще се изпраща сутрин)
                            </label>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => { setEditingTemplate(null); setIsNew(false); }}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg mr-3 transition-colors"
                            >
                                Отказ
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary flex items-center"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Запази шаблона
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Име</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Дни</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Заглавие (Subject)</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                            <p>Няма намерени имейл шаблони.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map((template) => (
                                        <tr key={template.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-textMain">{template.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                                                    {template.trigger_days}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-600 truncate max-w-xs" title={template.subject}>
                                                    {template.subject}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleToggleActive(template)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                                                        template.is_active ? 'bg-accent' : 'bg-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            template.is_active ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => { setEditingTemplate(template); setIsNew(false); }}
                                                    className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors ml-2"
                                                    title="Редактирай"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
