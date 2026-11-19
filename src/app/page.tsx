// import Link from 'next/link'
// import { ArrowRight, Star, MapPin, Tag, Smartphone } from 'lucide-react'

// export default function LandingPage() {
//   return (
//     <main className="min-h-screen bg-white">
//       {/* Nav */}
//       <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span className="text-2xl font-black text-red-600">ESR</span>
//             <span className="text-sm text-gray-500 hidden sm:block">Eat Sleep Repeat</span>
//           </div>
//           <div className="flex items-center gap-3">
//             <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
//               Sign In
//             </Link>
//             <Link href="/auth/signup" className="text-sm font-semibold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
//               Get Started
//             </Link>
//           </div>
//         </div>
//       </nav>

//       {/* Hero with Prominent Background Image */}
//       <section className="relative pt-32 pb-20 px-4 bg-gray-900 text-white overflow-hidden">
//         {/* Background Image with Lighter Overlay for Prominence */}
//         <div className="absolute inset-0 z-0">
//           <img 
//             src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop" 
//             alt="Delicious Food Spread" 
//             className="w-full h-full object-cover opacity-65"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
//         </div>

//         <div className="relative z-10 max-w-4xl mx-auto text-center">
//           <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md text-red-600 border border-red-200 text-sm font-medium px-3 py-1 rounded-full mb-6 shadow-sm">
//             <Star size={14} className="fill-current text-red-600" />
//             <span>Exclusive restaurant deals in your city</span>
//           </div>
//           <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-6 drop-shadow-md">
//             Discover Deals.<br />
//             <span className="text-red-500">Save More.</span><br />
//             Eat Better.
//           </h1>
//           <p className="text-xl text-gray-100 font-medium mb-10 max-w-2xl mx-auto drop-shadow-md">
//             ESR connects food lovers with exclusive discounts at top restaurants. Browse offers, redeem coupons, and enjoy great meals at unbeatable prices.
//           </p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center">
//             <Link href="/user/offers" className="inline-flex items-center justify-center gap-2 bg-red-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
//               Browse Offers <ArrowRight size={20} />
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* How It Works */}
//       <section className="py-20 px-4">
//         <div className="max-w-6xl mx-auto">
//           <div className="text-center mb-16">
//             <h2 className="text-3xl font-black text-gray-900 mb-4">How ESR Works</h2>
//             <p className="text-gray-600">Three simple steps to start saving at your favourite restaurants</p>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             {[
//               { step: '01', icon: '🔍', title: 'Browse Offers', desc: 'Discover exclusive discounts at restaurants near you. Filter by cuisine, price, or distance.' },
//               { step: '02', icon: '🎟️', title: 'Get Your Coupon', desc: 'Select an offer and receive a unique 4-digit coupon code. No printing needed.' },
//               { step: '03', icon: '🍽️', title: 'Redeem & Enjoy', desc: 'Show your coupon at the restaurant. The waiter enters the code and your discount is applied.' },
//             ].map(item => (
//               <div key={item.step} className="relative bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
//                 <div className="absolute -top-3 -left-3 w-10 h-10 bg-red-600 text-white text-sm font-black rounded-xl flex items-center justify-center">
//                   {item.step}
//                 </div>
//                 <div className="text-4xl mb-4">{item.icon}</div>
//                 <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
//                 <p className="text-gray-600">{item.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Features */}
//       <section className="py-20 px-4 bg-gray-50">
//         <div className="max-w-6xl mx-auto">
//           <div className="text-center mb-16">
//             <h2 className="text-3xl font-black text-gray-900 mb-4">Why Choose ESR?</h2>
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {[
//               { icon: <MapPin size={24} />, title: 'Nearby Restaurants', desc: 'Find deals within 5km of your location automatically' },
//               { icon: <Tag size={24} />, title: 'Real Discounts', desc: 'Genuine savings — no catch, no minimum spend required' },
//               { icon: <Star size={24} />, title: 'Verified Reviews', desc: 'Ratings from real diners who actually redeemed offers' },
//               { icon: <Smartphone size={24} />, title: 'Mobile App', desc: 'Available on iOS and Android for on-the-go discovery' },
//             ].map(f => (
//               <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm">
//                 <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
//                   {f.icon}
//                 </div>
//                 <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
//                 <p className="text-gray-600 text-sm">{f.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* For Owners */}
//       <section className="py-20 px-4">
//         <div className="max-w-6xl mx-auto">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
//             <div>
//               <h2 className="text-3xl font-black text-gray-900 mb-4">Are You a Restaurant Owner?</h2>
//               <p className="text-gray-600 mb-6">
//                 Join ESR and reach thousands of food lovers in your city. Create offers, track redemptions, manage reviews, and grow your customer base — all from one dashboard.
//               </p>
//               <ul className="space-y-3 mb-8">
//                 {[
//                   'Create and manage exclusive offers',
//                   'Track coupon redemptions in real-time',
//                   'Read and respond to customer reviews',
//                   'Advertise with banner ads',
//                   'Analytics dashboard for business insights',
//                 ].map(item => (
//                   <li key={item} className="flex items-center gap-3 text-gray-700">
//                     <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
//                     {item}
//                   </li>
//                 ))}
//               </ul>
//               <Link href="/admin/dashboard" className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">
//                 Access Owner Dashboard <ArrowRight size={18} />
//               </Link>
//             </div>
//             <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-8">
//               <div className="grid grid-cols-2 gap-4">
//                 {[
//                   { label: 'Active Restaurants', value: '50+' },
//                   { label: 'Offers Available', value: '200+' },
//                   { label: 'Happy Customers', value: '5K+' },
//                   { label: 'Coupons Redeemed', value: '10K+' },
//                 ].map(s => (
//                   <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
//                     <div className="text-2xl font-black text-red-600">{s.value}</div>
//                     <div className="text-xs text-gray-500 mt-1">{s.label}</div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* CTA */}
//       <section className="py-20 px-4 bg-red-600">
//         <div className="max-w-3xl mx-auto text-center">
//           <h2 className="text-3xl font-black text-white mb-4">Ready to Start Saving?</h2>
//           <p className="text-red-100 mb-8">Create a free account and start discovering exclusive restaurant deals today.</p>
//           <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-white text-red-600 font-bold text-lg px-8 py-4 rounded-xl hover:bg-red-50 transition-colors shadow-lg">
//             Create Free Account <ArrowRight size={20} />
//           </Link>
//         </div>
//       </section>
//     </main>
//   )
// }

import Link from 'next/link'
import { ArrowRight, Star, MapPin, Tag, Smartphone } from 'lucide-react'
import { redirect } from 'next/navigation'

export default function LandingPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    redirect('/user/offers')
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero with Prominent Background Image */}
      <section className="relative pt-24 pb-20 px-4 bg-gray-900 text-white overflow-hidden">
        {/* Background Image with Lighter Overlay for Prominence */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop" 
            alt="Delicious Food Spread" 
            className="w-full h-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md text-red-600 border border-red-200 text-sm font-medium px-3 py-1 rounded-full mb-6 shadow-sm">
            <Star size={14} className="fill-current text-red-600" />
            <span>Exclusive restaurant deals in your city</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-6 drop-shadow-md">
            Discover Deals.<br />
            <span className="text-red-500">Save More.</span><br />
            Eat Better.
          </h1>
          <p className="text-xl text-gray-100 font-medium mb-10 max-w-2xl mx-auto drop-shadow-md">
            ESR connects food lovers with exclusive discounts at top restaurants. Browse offers, redeem coupons, and enjoy great meals at unbeatable prices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/user/offers" className="inline-flex items-center justify-center gap-2 bg-red-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
              Browse Offers <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">How ESR Works</h2>
            <p className="text-gray-600">Three simple steps to start saving at your favourite restaurants</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '🔍', title: 'Browse Offers', desc: 'Discover exclusive discounts at restaurants near you. Filter by cuisine, price, or distance.' },
              { step: '02', icon: '🎟️', title: 'Get Your Coupon', desc: 'Select an offer and receive a unique 4-digit coupon code. No printing needed.' },
              { step: '03', icon: '🍽️', title: 'Redeem & Enjoy', desc: 'Show your coupon at the restaurant. The waiter enters the code and your discount is applied.' },
            ].map(item => (
              <div key={item.step} className="relative bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-red-600 text-white text-sm font-black rounded-xl flex items-center justify-center">
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Why Choose ESR?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <MapPin size={24} />, title: 'Nearby Restaurants', desc: 'Find deals within 5km of your location automatically' },
              { icon: <Tag size={24} />, title: 'Real Discounts', desc: 'Genuine savings — no catch, no minimum spend required' },
              { icon: <Star size={24} />, title: 'Verified Reviews', desc: 'Ratings from real diners who actually redeemed offers' },
              { icon: <Smartphone size={24} />, title: 'Mobile App', desc: 'Available on iOS and Android for on-the-go discovery' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Owners */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Are You a Restaurant Owner?</h2>
              <p className="text-gray-600 mb-6">
                Join ESR and reach thousands of food lovers in your city. Create offers, track redemptions, manage reviews, and grow your customer base — all from one dashboard.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Create and manage exclusive offers',
                  'Track coupon redemptions in real-time',
                  'Read and respond to customer reviews',
                  'Advertise with banner ads',
                  'Analytics dashboard for business insights',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/admin/dashboard" className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">
                Access Owner Dashboard <ArrowRight size={18} />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Active Restaurants', value: '50+' },
                  { label: 'Offers Available', value: '200+' },
                  { label: 'Happy Customers', value: '5K+' },
                  { label: 'Coupons Redeemed', value: '10K+' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-red-600">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-red-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Start Saving?</h2>
          <p className="text-red-100 mb-8">Create a free account and start discovering exclusive restaurant deals today.</p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-white text-red-600 font-bold text-lg px-8 py-4 rounded-xl hover:bg-red-50 transition-colors shadow-lg">
            Create Free Account <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </main>
  )
}
