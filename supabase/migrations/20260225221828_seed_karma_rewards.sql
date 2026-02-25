-- Seed the karma_rewards table with 10 initial entries (some active, some promotional inactive)

INSERT INTO karma_rewards (title, description, cost_points, reward_type, reward_value, duration_days, is_active)
VALUES
  ('1 Ден Ultra Тест', 'Изпробвай всички Ultra функции за 24 часа! (1 Ден)', 150, 'PLAN_UPGRADE', 'ULTRA', 1, true),
  ('1 Уйкенд Ultra', 'Перфектно за почивните дни. Ultra абонамент за 2 дни!', 250, 'PLAN_UPGRADE', 'ULTRA', 2, true),
  ('1 Седмица Ultra План', 'Отключи всички AI модели и лимити за цяла седмица.', 600, 'PLAN_UPGRADE', 'ULTRA', 7, true),
  ('1 Месец Ultra План', 'Пълният Ultra пакет за 30 пълни дни.', 2000, 'PLAN_UPGRADE', 'ULTRA', 30, true),
  ('1 Ден Pro Тест', 'Изпробвай Pro функциите за 24 часа.', 50, 'PLAN_UPGRADE', 'PRO', 1, true),
  ('1 Уйкенд Pro', 'Отключи Pro плана за 2 дни.', 90, 'PLAN_UPGRADE', 'PRO', 2, true),
  ('1 Седмица Pro План', 'Pro абонамент за 7 дни.', 250, 'PLAN_UPGRADE', 'PRO', 7, true),
  ('1 Месец Pro План', 'Пълният Pro пакет за цял месец.', 800, 'PLAN_UPGRADE', 'PRO', 30, true),
  ('1 Месец Business План', 'Отключи най-високия клас функции. Идеален за бизнеси.', 6000, 'PLAN_UPGRADE', 'BUSINESS', 30, true),
  ('Празнична Промоция: 3 Месеца Ultra', 'Ограничена празнична оферта. 90 дни Ultra на страхотна цена!', 4000, 'PLAN_UPGRADE', 'ULTRA', 90, false);
