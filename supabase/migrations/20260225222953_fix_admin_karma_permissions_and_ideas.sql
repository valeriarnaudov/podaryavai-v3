-- Fix DELETE permissions for karma_rewards so admins can remove rewards
CREATE POLICY "Admins can delete rewards" ON karma_rewards FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Fix SELECT permissions for users so admins can see history details
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users AS admin_check WHERE admin_check.id = auth.uid() AND admin_check.is_admin = true)
);

-- Seed 30 ideas for rewards as inactive
INSERT INTO karma_rewards (title, description, cost_points, reward_type, reward_value, duration_days, is_active)
VALUES
 ('Коледен Ultra Пакет (7 Дни)', 'Специална коледна оферта: 1 седмица Ultra абонамент.', 400, 'PLAN_UPGRADE', 'ULTRA', 7, false),
 ('Черен Петък Pro (30 Дни)', 'Разпродажба за Черен петък. 1 Месец Pro!', 500, 'PLAN_UPGRADE', 'PRO', 30, false),
 ('Свети Валентин Специален (3 Дни)', 'Подари си любов: 3 дни Ultra план без ограничения.', 150, 'PLAN_UPGRADE', 'ULTRA', 3, false),
 ('Великденски Подарък Ultra (14 Дни)', 'Великденски празници с Ultra абонамент.', 800, 'PLAN_UPGRADE', 'ULTRA', 14, false),
 ('Business План за Стартъпи (14 Дни)', 'Тествай пълния бизнес капацитет за 2 седмици.', 3000, 'PLAN_UPGRADE', 'BUSINESS', 14, false),
 ('Лятна Промоция: Месец Pro', 'Един месец спокойствие на плажа с Pro функции.', 700, 'PLAN_UPGRADE', 'PRO', 30, false),
 ('Лятна Промоция: Месец Ultra', 'Перфектен за ваканцията. 30 дни Ultra.', 1800, 'PLAN_UPGRADE', 'ULTRA', 30, false),
 ('Back to School Pro (30 Дни)', 'Завръщане в училище: един месец Pro план.', 650, 'PLAN_UPGRADE', 'PRO', 30, false),
 ('Хелоуин Ultra Изненада (3 Дни)', 'Страшно добра оферта за Хелоуин.', 120, 'PLAN_UPGRADE', 'ULTRA', 3, false),
 ('Новогодишен Ultra Старт (30 Дни)', 'Нова година, нов късмет. 30 дни Ultra абонамент.', 1500, 'PLAN_UPGRADE', 'ULTRA', 30, false),
 ('Пролетен Pro Пакет (14 Дни)', 'Пролетно разчистване с 2 седмици Pro.', 400, 'PLAN_UPGRADE', 'PRO', 14, false),
 ('Уикенд Маратон: Business (2 Дни)', 'Две денонощия най-висок капацитет.', 1000, 'PLAN_UPGRADE', 'BUSINESS', 2, false),
 ('24-Часов Business Тест', 'Един ден пробен период за Business абонамент.', 600, 'PLAN_UPGRADE', 'BUSINESS', 1, false),
 ('VIP Рожден Ден (7 Дни Ultra)', 'Подарък за рожден ден: седмица Ultra.', 350, 'PLAN_UPGRADE', 'ULTRA', 7, false),
 ('Зимен Pro Пакет (90 Дни)', 'Три месеца Pro на достъпна цена през студените дни.', 2000, 'PLAN_UPGRADE', 'PRO', 90, false),
 ('Есенна Ultra Разпродажба (60 Дни)', 'Есенен листопад на цените. 2 месеца Ultra.', 3000, 'PLAN_UPGRADE', 'ULTRA', 60, false),
 ('Flash Sale: Pro за 1 Ден', 'Светкавична разпродажба за един ден Pro.', 30, 'PLAN_UPGRADE', 'PRO', 1, false),
 ('Специален Подарък от Екипа (7 Дни Pro)', 'Една седмица Pro абонамент като благодарност.', 150, 'PLAN_UPGRADE', 'PRO', 7, false),
 ('Business Тримесечие (90 Дни)', 'Тримесечен план Business на преференциална цена.', 15000, 'PLAN_UPGRADE', 'BUSINESS', 90, false),
 ('Лоялен Клиент Ultra (6 Месеца)', 'За нашите най-лоялни клиенти. Половин година Ultra!', 8000, 'PLAN_UPGRADE', 'ULTRA', 180, false),
 ('Студентски Pro Пакет (6 Месеца)', 'Половин година Pro абонамент, специално за студенти.', 3500, 'PLAN_UPGRADE', 'PRO', 180, false),
 ('Ранно Пиле Ultra (14 Дни)', 'Супер оферта за подранилите. Ultra за 2 седмици.', 600, 'PLAN_UPGRADE', 'ULTRA', 14, false),
 ('Cyber Monday Business (30 Дни)', 'Кибер понеделник оферта. 30 дни бизнес функции.', 4000, 'PLAN_UPGRADE', 'BUSINESS', 30, false),
 ('Благотворителен Pro (30 Дни)', 'Karma инициатива: 30 дни Pro, като половината точки отиват за кауза.', 1000, 'PLAN_UPGRADE', 'PRO', 30, false),
 ('VIP Ултра Пропуск (1 Година)', 'Пълната Ultra мощност за една цяла година.', 15000, 'PLAN_UPGRADE', 'ULTRA', 365, false),
 ('Стартов Пакет Pro (7 Дни)', 'Най-добрият начин да започнеш, ако си нов.', 100, 'PLAN_UPGRADE', 'PRO', 7, false),
 ('Промо: Втори Шанс Ultra (1 Ден)', 'Изпусна предишната оферта? Пробвай Ultra за един ден пак.', 100, 'PLAN_UPGRADE', 'ULTRA', 1, false),
 ('Ексклузивен Достъп Business (7 Дни)', '7 дни на най-високо ниво - Business план.', 2000, 'PLAN_UPGRADE', 'BUSINESS', 7, false),
 ('Тайна Ultra Награда (3 Дни)', 'Отключи я, за да разбереш какво предлага (3 Дни Ultra).', 200, 'PLAN_UPGRADE', 'ULTRA', 3, false),
 ('Business за Фрийлансъри (30 Дни)', 'План Business, пригоден специално за независими специалисти.', 5000, 'PLAN_UPGRADE', 'BUSINESS', 30, false);
