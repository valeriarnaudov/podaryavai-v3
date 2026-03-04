-- Create Email Templates table
CREATE TABLE public.email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_days INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (allow authenticated users for now, though realistically only admin needs it, daily cron uses service role)
CREATE POLICY "Authenticated users can read email templates"
    ON public.email_templates FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for managing (admin only)
CREATE POLICY "Admins can manage email templates"
    ON public.email_templates FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
      )
    );

-- Seed Default Templates
INSERT INTO public.email_templates (name, trigger_days, subject, body_html, is_active)
VALUES 
(
  '10 Days Before', 
  10, 
  'Наближава: {{eventTitle}} на {{contactName}} след {{daysLeft}} дни! ⏳',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center;">
        <h1 style="color: #0f172a; margin-bottom: 10px;">Здравей, {{userName}}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #475569;">
          Напомняме ти, че <strong>{{contactName}}</strong> има <strong>{{eventTitle}}</strong> след 10 дни!
        </p>
      </div>
      <div style="padding: 20px; text-align: left;">
        <h3 style="color: #0f172a;">Имате достатъчно време да изберете перфектния подарък.</h3>
        <p>Не чакайте последния момент!</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.podaryavai.com" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Отвори Podaryavai & Намери Подарък</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
        <p>Получавате този имейл, защото сте включили известията за {{contactName}} в Podaryavai.</p>
        <p>© 2026 Podaryavai & Social Ecosystem</p>
      </div>
    </div>',
  true
),
(
  '7 Days Before', 
  7, 
  'Наближава: {{eventTitle}} на {{contactName}} след 7 дни! ⏳',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center;">
        <h1 style="color: #0f172a; margin-bottom: 10px;">Здравей, {{userName}}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #475569;">
          Напомняме ти, че <strong>{{contactName}}</strong> има <strong>{{eventTitle}}</strong> след 7 дни!
        </p>
      </div>
      <div style="padding: 20px; text-align: left;">
        <h3 style="color: #0f172a;">Остава точно една седмица!</h3>
        <p>Сега е моментът да поръчате, за да пристигне навреме.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.podaryavai.com" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Отвори Podaryavai & Намери Подарък</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
        <p>Получавате този имейл, защото сте включили известията за {{contactName}} в Podaryavai.</p>
        <p>© 2026 Podaryavai & Social Ecosystem</p>
      </div>
    </div>',
  true
),
(
  '3 Days Before', 
  3, 
  'Наближава: {{eventTitle}} на {{contactName}} след 3 дни! ⏳',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center;">
        <h1 style="color: #0f172a; margin-bottom: 10px;">Здравей, {{userName}}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #475569;">
          Напомняме ти, че <strong>{{contactName}}</strong> има <strong>{{eventTitle}}</strong> след 3 дни!
        </p>
      </div>
      <div style="padding: 20px; text-align: left;">
        <h3 style="color: #0f172a;">Времето изтича!</h3>
        <p>Действайте бързо, остават само 3 дни!</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.podaryavai.com" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Отвори Podaryavai & Намери Подарък</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
        <p>Получавате този имейл, защото сте включили известията за {{contactName}} в Podaryavai.</p>
        <p>© 2026 Podaryavai & Social Ecosystem</p>
      </div>
    </div>',
  true
),
(
  'On the Day', 
  0, 
  'Днес е празникът: {{eventTitle}} на {{contactName}}! 🎉',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center;">
        <h1 style="color: #0f172a; margin-bottom: 10px;">Здравей, {{userName}}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #475569;">
          Напомняме ти, че <strong>{{contactName}}</strong> има <strong>{{eventTitle}}</strong> ДНЕС!
        </p>
      </div>
      <div style="padding: 20px; text-align: left;">
        <h3 style="color: #0f172a;">Празникът е днес!</h3>
        <p>Надяваме се, че вече сте подготвили изненадата. Ако не – нашите дигитални ваучери са на един клик разстояние.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.podaryavai.com" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Отвори Podaryavai & Намери Подарък</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
        <p>Получавате този имейл, защото сте включили известията за {{contactName}} в Podaryavai.</p>
        <p>© 2026 Podaryavai & Social Ecosystem</p>
      </div>
    </div>',
  true
);
