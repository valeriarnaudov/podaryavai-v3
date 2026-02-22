/**
 * Еmail Шаблони за Уведомления (Podaryavai)
 * 
 * Този файл съдържа всички текстови и HTML шаблони, които се изпращат до потребителите.
 * За да промените текста на имейлите, просто редактирайте функциите по-долу.
 * 
 * Параметри:
 * - userName: Името на потребителя
 * - contactName: Името на контакта (приятеля)
 * - eventTitle: Заглавието на повода (пр. Рожден Ден, Имен Ден)
 * - daysLeft: Оставащи дни до събитието (10, 7, 3, 0)
 */

export function getUpcomingEventEmailSubject(eventTitle: string, contactName: string, daysLeft: number): string {
  if (daysLeft === 0) {
    return `Днес е празникът: ${eventTitle} на ${contactName}! 🎉`;
  }
  return `Наближава: ${eventTitle} на ${contactName} след ${daysLeft} дни! ⏳`;
}

export function getUpcomingEventEmailHtml(
  userName: string, 
  contactName: string, 
  eventTitle: string, 
  daysLeft: number
): string {
  
  let headerMessage = '';
  let urgencyMessage = '';

  if (daysLeft === 10) {
    headerMessage = 'Имате достатъчно време да изберете перфектния подарък.';
    urgencyMessage = 'Не чакайте последния момент!';
  } else if (daysLeft === 7) {
    headerMessage = 'Остава точно една седмица!';
    urgencyMessage = 'Сега е моментът да поръчате, за да пристигне навреме.';
  } else if (daysLeft === 3) {
    headerMessage = 'Времето изтича!';
    urgencyMessage = 'Действайте бързо, остават само 3 дни!';
  } else if (daysLeft === 0) {
    headerMessage = 'Празникът е днес!';
    urgencyMessage = 'Надяваме се, че вече сте подготвили изненадата. Ако не – нашите дигитални ваучери са на един клик разстояние.';
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center;">
        <h1 style="color: #0f172a; margin-bottom: 10px;">Здравей, ${userName}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #475569;">
          Напомняме ти, че <strong>${contactName}</strong> има <strong>${eventTitle}</strong> 
          ${daysLeft === 0 ? 'ДНЕС' : `след ${daysLeft} дни`}!
        </p>
      </div>

      <div style="padding: 20px; text-align: left;">
        <h3 style="color: #0f172a;">${headerMessage}</h3>
        <p>${urgencyMessage}</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.podaryavai.com" 
             style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             Отвори Podaryavai & Намери Подарък
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
        <p>Получавате този имейл, защото сте включили известията за ${contactName} в Podaryavai.</p>
        <p>© ${new Date().getFullYear()} Podaryavai & Social Ecosystem</p>
      </div>
    </div>
  `;
}
