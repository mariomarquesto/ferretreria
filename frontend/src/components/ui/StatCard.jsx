export default function StatCard({ titulo, valor, sub, color = 'from-blue-500 to-blue-600', icono }) {
  return (
    <div className={`bg-linear-to-br ${color} text-white p-5 rounded-xl shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm opacity-90">{titulo}</p>
        {icono && <span className="text-2xl">{icono}</span>}
      </div>
      <p className="text-2xl font-bold tracking-tight">{valor}</p>
      {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
    </div>
  );
}