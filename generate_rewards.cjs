const fs = require('fs');

const rewards = [];
let idCounter = 1;

// 1. FREE DELIVERIES (30 variations)
for (let i = 1; i <= 30; i++) {
    const amount = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const cost = amount * 100 + (Math.floor(Math.random() * 5) * 10);
    rewards.push({
        title: `${amount} Безплатн${amount > 1 ? 'и' : 'а'} Доставк${amount > 1 ? 'и' : 'а'} 📦`,
        description: `Спести от куриерски услуги с ${amount} допълнителн${amount > 1 ? 'и' : 'а'} безплатн${amount > 1 ? 'и' : 'а'} доставк${amount > 1 ? 'и' : 'а'}.`,
        cost_points: cost,
        reward_type: 'ADD_FREE_DELIVERIES',
        reward_metadata: { amount },
        duration_days: 0
    });
}

// 2. KARMA BOOSTS (30 variations)
for (let i = 1; i <= 30; i++) {
    const days = Math.random() > 0.5 ? 1 : (Math.random() > 0.5 ? 3 : 7);
    const cost = days * 150;
    rewards.push({
        title: `Dvojna Karma за ${days} Де${days > 1 ? 'на' : 'н'} 🚀`,
        description: `Активирай режим "Boost" и печели двойно повече Карма точки за всяко действие за следващите ${days} дни!`,
        cost_points: cost,
        reward_type: 'KARMA_BOOST',
        reward_metadata: {},
        duration_days: days
    });
}

// 3. GOLDEN AURA (30 variations)
for (let i = 1; i <= 30; i++) {
    const days = Math.random() > 0.5 ? 7 : 30;
    const cost = days === 7 ? 500 : 1500;
    rewards.push({
        title: `Златна Аура (${days} дни) ✨`,
        description: `Отличи профила си със специална светеща Златна Аура, която всички ще виждат.`,
        cost_points: cost,
        reward_type: 'UNLOCK_GOLDEN_AURA',
        reward_metadata: {},
        duration_days: days
    });
}

// 4. PLAN UPGRADES (30 variations)
const plans = ['STANDARD', 'PRO', 'ULTRA', 'BUSINESS'];
for (let i = 1; i <= 30; i++) {
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const days = Math.random() > 0.5 ? 7 : 30;
    const cost = plan === 'STANDARD' ? 300 : (plan === 'PRO' ? 800 : (plan === 'ULTRA' ? 1500 : 3000));
    rewards.push({
        title: `${plan} План Пробен Период (${days} дни) 💎`,
        description: `Отключи всички функции на план ${plan} напълно безплатно за ${days} дни.`,
        cost_points: cost,
        reward_type: 'PLAN_UPGRADE',
        reward_value: plan,
        reward_metadata: {},
        duration_days: days
    });
}

// 5. CUSTOM SERVICES & FUN STUFF (30 variations)
const customIdeas = [
    { title: "Лична Консултация (30 мин)", cost: 2000, desc: "Специална сесия с нашия екип за намиране на идеалния подарък.", instr: "Schedule a 30m call" },
    { title: "Изненада по Пощата 💌", cost: 5000, desc: "Ние ще ти изпратим истинска физическа картичка по пощата от екипа ни.", instr: "Send physical postcard" },
    { title: "VIP Giftinder Завинаги 👑", cost: 10000, desc: "Перманентен достъп до най-умния AI асистент за подаръци.", instr: "", type: "UNLOCK_VIP_GIFTINDER" },
    { title: "Името ти в 'Стената на Славата' 🏆", cost: 3000, desc: "Ще добавим името ти в специалната страница за най-добри клиенти.", instr: "Add to hall of fame" },
    { title: "Лично Видео Послание 🎥", cost: 4000, desc: "Екипът на Podaryavai ще запише специално благодарствено видео за теб.", instr: "Record personalized thank you video" },
    { title: "Подкрепа за Кауза 🌳", cost: 1000, desc: "Ще засадим 1 дърво от твое име.", instr: "Donate 1 tree planting" }
];

for(let i = 0; i < 30; i++) {
   const idea = customIdeas[i % customIdeas.length];
   rewards.push({
       title: `${idea.title} #${i+1}`,
       description: idea.desc,
       cost_points: idea.cost + (i*10),
       reward_type: idea.type || 'CUSTOM_SERVICE',
       reward_metadata: idea.type ? {} : { instructions: idea.instr },
       duration_days: 0
   });
}

// Generate SQL
let sql = `-- Seed file for 150 diverse Karma Rewards generated automatically\n\n`;
sql += `INSERT INTO public.karma_rewards (title, description, cost_points, reward_type, reward_value, reward_metadata, duration_days, is_active)\nVALUES \n`;

const values = rewards.map(r => {
    return `('${r.title.replace(/'/g, "''")}', '${r.description.replace(/'/g, "''")}', ${r.cost_points}, '${r.reward_type}', '${r.reward_value || ''}', '${JSON.stringify(r.reward_metadata)}'::jsonb, ${r.duration_days}, true)`;
}).join(',\n');

sql += values + `;\n`;

fs.writeFileSync('supabase/migrations/20260225225500_seed_150_karma_rewards.sql', sql);
console.log("SQL Migration generated.");
