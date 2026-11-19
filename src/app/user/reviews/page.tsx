const SAMPLE_POSTS = [
  {
    id: 'p1',
    user: 'Ayesha K',
    restaurant: "Pizzeria Bella",
    item: 'Margherita Pizza',
    rating: 5,
    text: 'Perfect crust, fresh basil and fantastic cheese — used the 30% off deal and it was worth it!',
    verified: true,
  },
  {
    id: 'p2',
    user: 'Hamza R',
    restaurant: 'Ammi\'s Home Kitchen',
    item: 'Special Biryani Combo',
    rating: 4,
    text: 'Home-made flavours, generous portions. Slightly spicy but amazing aroma.',
    verified: true,
  },
  {
    id: 'p3',
    user: 'Sania M',
    restaurant: 'Chai Khana',
    item: 'Chai & Paratha Deal',
    rating: 4,
    text: 'Great early-morning combo. Paratha was flaky and chai was on point.',
    verified: false,
  },
  {
    id: 'p4',
    user: 'Omar B',
    restaurant: 'Tokyo Sushi Bar',
    item: 'Salmon Roll Sushi Platter',
    rating: 5,
    text: 'Fresh fish and clean presentation. Claimed voucher and saved 25%!',
    verified: true,
  },
]

function Stars({ n }: { n: number }) {
  return <span className="text-red-500">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Foodie Feed</h1>
      <p className="mt-2 text-gray-600 mb-6">A feed of verified reviews, photos and quick notes from food lovers across Pakistan.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLE_POSTS.map((p) => (
          <article key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{p.user}</div>
                <div className="text-xs text-gray-500">{p.restaurant} • <span className="font-medium">{p.item}</span></div>
              </div>
              <div className="text-right">
                <div className="text-sm"><Stars n={p.rating} /></div>
                {p.verified && <div className="text-xs text-emerald-600 font-medium mt-1">Verified Review</div>}
              </div>
            </div>
            <p className="mt-3 text-gray-700">{p.text}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
