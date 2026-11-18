const POSTS = [
  {
    id: 'b1',
    title: 'Building the ESR Web App — Lessons Learned',
    author: 'You',
    excerpt: 'A behind-the-scenes look at how I structured the Next.js app, Supabase auth, and the Offers flow.'
  },
  {
    id: 'b2',
    title: 'Designing Foodie Feed for Real Users',
    author: 'You',
    excerpt: 'How verified reviews and photo checks help improve trust and conversion.'
  },
  {
    id: 'b3',
    title: 'From Idea to Launch: ESR Stories',
    author: 'You',
    excerpt: 'Early milestones, pitfalls, and what to focus on when building food discovery apps.'
  }
]

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">ESR Bloggers</h1>
      <p className="mt-2 text-gray-600 mb-6">Personal web-app stories, guides and learnings from the ESR team.</p>

      <div className="space-y-4">
        {POSTS.map(p => (
          <article key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold mb-1">{p.title}</h2>
            <div className="text-xs text-gray-500 mb-3">By {p.author}</div>
            <p className="text-gray-700">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
