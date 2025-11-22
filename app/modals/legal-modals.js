/**
 * Legal Documents Modals
 * 
 * Модальные окна для отображения юридических документов:
 * - Политика обработки персональных данных
 * - Публичная оферта
 * 
 * @package ElkaRetro
 */

/**
 * Контент для политики обработки персональных данных
 */
function getPrivacyPolicyContent() {
  return `
    <div style="max-width: 100%; line-height: 1.6; color: var(--color-foreground);">
      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-foreground);">
        ПОЛИТИКА ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
      </h2>
      <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 2rem; color: var(--color-muted-foreground);">
        в интернет-магазине «[Название вашего магазина]»
      </p>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          1. Общие положения
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>1.1.</strong> Настоящая Политика обработки персональных данных (далее — «Политика») разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (с изменениями на 2025 год) и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных в ООО «[Ваше юридическое название]» (далее — «Оператор»).
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>1.2.</strong> Политика доступна неограниченному кругу лиц путем размещения в сети «Интернет» по адресу: [URL-адрес страницы с Политикой, например: yourstore.ru/privacy].
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          2. Основные понятия, используемые в Политике
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.1.</strong> Персональные данные — любая информация, относящаяся к прямо или косвенно определенному или определяемому физическому лицу (субъекту персональных данных).
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.2.</strong> Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.3.</strong> Оператор — организация, самостоятельно или совместно с другими лицами организующая обработку персональных данных. В рамках данной Политики Оператором является ООО «[Ваше юридическое название]».
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          3. Принципы и условия обработки персональных данных
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>3.1.</strong> Обработка персональных данных у Оператора осуществляется на основе следующих принципов:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Законности и справедливости;</li>
          <li style="margin-bottom: 0.5rem;">Ограничения обработки достижением конкретных, заранее определенных и законных целей;</li>
          <li style="margin-bottom: 0.5rem;">Соответствия содержания и объема обрабатываемых персональных данных заявленным целям обработки;</li>
          <li style="margin-bottom: 0.5rem;">Достоверности персональных данных, их достаточности для целей обработки;</li>
          <li style="margin-bottom: 0.5rem;">Обработки только тех персональных данных, которые необходимы для достижения целей обработки.</li>
        </ul>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>3.2.</strong> Оператор обрабатывает персональные данные только при наличии хотя бы одного из следующих условий:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Субъект персональных данных дал согласие на обработку своих персональных данных;</li>
          <li style="margin-bottom: 0.5rem;">Обработка необходима для исполнения договора, стороной которого является субъект персональных данных (в частности, договора купли-продажи).</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          4. Перечень обрабатываемых персональных данных и цели их обработки
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>4.1.</strong> Цели обработки:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Заключение и исполнение договора купли-продажи товаров в интернет-магазине;</li>
          <li style="margin-bottom: 0.5rem;">Обработка и доставка заказов;</li>
          <li style="margin-bottom: 0.5rem;">Осуществление обратной связи с клиентом (уточнение деталей заказа, консультирование);</li>
          <li style="margin-bottom: 0.5rem;">Выполнение обязательств, предусмотренных законодательством РФ (например, по бухгалтерскому учету).</li>
        </ul>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>4.2.</strong> Категории обрабатываемых персональных данных:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Фамилия, имя, отчество;</li>
          <li style="margin-bottom: 0.5rem;">Адрес электронной почты (e-mail);</li>
          <li style="margin-bottom: 0.5rem;">Контактный телефонный номер;</li>
          <li style="margin-bottom: 0.5rem;">Адрес доставки товара.</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          5. Порядок и условия обработки персональных данных
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.1.</strong> Обработка персональных данных осуществляется смешанным способом (автоматизированным и неавтоматизированным).
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.2.</strong> Оператор обеспечивает конфиденциальность персональных данных и принимает все меры для их защиты.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.3.</strong> Передача персональных данных третьим лицам осуществляется только для достижения законных целей. Оператор может передавать персональные данные следующим категориям третьих лиц:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Курьерские службы и службы доставки (для осуществления доставки заказов);</li>
          <li style="margin-bottom: 0.5rem;">Платежные системы и банки (для обработки платежей);</li>
          <li style="margin-bottom: 0.5rem;">Государственные органы в случаях, предусмотренных законодательством РФ.</li>
        </ul>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.4.</strong> Срок обработки персональных данных определяется сроком действия согласия субъекта на их обработку, либо иными основаниями, предусмотренными законом. После достижения целей обработки или при отзыве согласия субъекта персональные данные подлежат уничтожению.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          6. Требования к защите персональных данных
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>6.1.</strong> Оператор принимает необходимые и достаточные организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий с ними.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>6.2.</strong> Меры защиты включают в себя:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Назначение ответственного за организацию обработки персональных данных;</li>
          <li style="margin-bottom: 0.5rem;">Применение средств защиты информации (антивирусы, системы обнаружения вторжений);</li>
          <li style="margin-bottom: 0.5rem;">Ограничение и разграничение доступа сотрудников к персональным данным.</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          7. Права субъекта персональных данных
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>7.1.</strong> Субъект персональных данных имеет право:
        </p>
        
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">На получение информации, касающейся обработки его персональных данных;</li>
          <li style="margin-bottom: 0.5rem;">На уточнение, блокирование или уничтожение его персональных данных в случае, если они являются неполными, устаревшими, недостоверными;</li>
          <li style="margin-bottom: 0.5rem;">На отзыв данного им согласия на обработку персональных данных;</li>
          <li style="margin-bottom: 0.5rem;">На обжалование действий или бездействия Оператора в уполномоченный орган (Роскомнадзор).</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          8. Заключительные положения
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>8.1.</strong> Настоящая Политика является общедоступной и подлежит размещению на официальном сайте Оператора.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>8.2.</strong> К настоящей Политике может иметься доступ с главной страницы сайта, а также со всех страниц сайта, где запрашиваются персональные данные пользователя (формы заказа, регистрации, подписки).
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>8.3.</strong> Актуальная версия Политики в редакции от «__» ________ 2025 года хранится в печатном виде по юридическому адресу Оператора.
        </p>
        
        <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(155, 140, 255, 0.05); border-radius: 0.5rem; border: 1px solid var(--color-border-accent);">
          <h4 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-foreground);">
            Реквизиты Оператора:
          </h4>
          <p style="margin-bottom: 0.5rem; color: var(--color-muted-foreground);">
            ООО «[Ваше юридическое название]»
          </p>
          <p style="margin-bottom: 0.5rem; color: var(--color-muted-foreground);">
            Юридический адрес: [Ваш юридический адрес]
          </p>
          <p style="margin-bottom: 0.5rem; color: var(--color-muted-foreground);">
            ИНН [Ваш ИНН] / ОГРН [Ваш ОГРН]
          </p>
          <p style="margin-bottom: 0; color: var(--color-muted-foreground);">
            Электронная почта для обращений по вопросам персональных данных: privacy@yourstore.ru
          </p>
        </div>
      </section>
    </div>
  `;
}

/**
 * Контент для согласия на обработку персональных данных
 */
function getPrivacyConsentContent() {
  return `
    <div style="max-width: 100%; line-height: 1.6; color: var(--color-foreground);">
      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-foreground);">
        СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ
      </h2>
      
      <p style="margin-bottom: 1.5rem; color: var(--color-muted-foreground);">
        Настоящим я, действуя свободно, своей волей и в своем интересе, предоставляю ООО "Ваш Магазин" (ИНН 1234567890, ОГРН 1234567890123, адрес: 123456, г. Москва, ул. Примерная, д. 1), далее – «Оператор», свое согласие на обработку моих персональных данных на следующих условиях:
      </p>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Цель обработки:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Обработка моих персональных данных будет осуществляться исключительно для следующих целей:
        </p>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Исполнение договора купли-продажи (соглашения оферты), включая оформление, доставку и возврат заказов.</li>
          <li style="margin-bottom: 0.5rem;">Обеспечение связи со мной для уточнения деталей заказа, консультирования и информирования о статусе заказа.</li>
          <li style="margin-bottom: 0.5rem;">Выполнение требований действующего законодательства Российской Федерации.</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Перечень обрабатываемых данных:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Я даю согласие на обработку следующих моих персональных данных:
        </p>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Фамилия, имя, отчество.</li>
          <li style="margin-bottom: 0.5rem;">Адрес электронной почты (e-mail).</li>
          <li style="margin-bottom: 0.5rem;">Контактный телефонный номер.</li>
          <li style="margin-bottom: 0.5rem;">Адрес для доставки товаров.</li>
          <li style="margin-bottom: 0.5rem;">Иные данные, необходимые для достижения целей обработки.</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Перечень действий с данными:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Я согласен, что с моими персональными данными могут совершаться следующие действия: сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление, доступ), обезличивание, блокирование, удаление, уничтожение — как автоматизированным, так и неавтоматизированным способами.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Передача данных третьим лицам:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Я даю отдельное согласие на передачу моих персональных данных следующим третьим лицам для достижения заявленных целей:
        </p>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; color: var(--color-muted-foreground); list-style-type: disc;">
          <li style="margin-bottom: 0.5rem;">Курьерским службам и почтовым операторам (например, ООО "Курьер Сервис", ИНН 0987654321) — для осуществления доставки заказов.</li>
          <li style="margin-bottom: 0.5rem;">Сервису онлайн-платежей (например, ООО "Платежный Провайдер", ИНН 1122334455) — для обработки платежей.</li>
        </ul>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Срок действия согласия:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Согласие действует в течение 5 (пяти) лет с момента его предоставления либо до момента его отзыва в установленном порядке.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          Порядок отзыва согласия:
        </h3>
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          Я осведомлен(а), что могу в любой момент отозвать настоящее согласие, направив Оператору соответствующее письменное заявление по адресу, указанному выше, или на адрес электронной почты: privacy@yourstore.ru. Оператор обязан прекратить обработку моих данных и уничтожить их в срок, не превышающий 30 (тридцати) дней с даты получения отзыва, если иное не предусмотрено действующим законодательством РФ.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          С текстом <a href="#" data-app-action="legal.openPrivacyPolicy" style="color: var(--color-primary, #0055FF); text-decoration: none; border-bottom: 1px solid var(--color-primary, #0055FF);">Политики в отношении обработки персональных данных</a> и иными внутренними документами Оператора, регламентирующими обработку ПДн, я ознакомлен(а) и согласен(а). Все условия настоящего согласия мне понятны.
        </p>
      </section>
    </div>
  `;
}

/**
 * Контент для публичной оферты
 */
function getPublicOfferContent() {
  return `
    <div style="max-width: 100%; line-height: 1.6; color: var(--color-foreground);">
      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-foreground);">
        ДОГОВОР ПУБЛИЧНОЙ ОФЕРТЫ
      </h2>
      <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 2rem; color: var(--color-muted-foreground);">
        для интернет-магазина комиссионных товаров
      </p>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          1. Общие положения
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>1.1.</strong> Настоящий документ является официальным публичным предложением Интернет-магазина «[Название вашего магазина]» (далее — «Продавец»), в лице [Указать реквизиты, например: ИП ФИО, ОГРНИП, адрес], заключить договор купли-продажи товаров, представленных на сайте [Ваш URL-адрес] (далее — «Сайт»), с любым физическим лицом (далее — «Покупатель») на условиях, изложенных ниже.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>1.2.</strong> В соответствии с пунктом 3 статьи 438 Гражданского кодекса Российской Федерации (ГК РФ), полным и безоговорочным акцептом (принятием) данной оферты считается факт оформления Заказа на Сайте и/или внесения Покупателем 100% предоплаты за Товар.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          2. Особенности комиссионного товара
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.1.</strong> Все товары, представленные в интернет-магазине, являются комиссионными. Это означает, что Продавец реализует товары, переданные ему третьими лицами (Комитентами), за вознаграждение и от своего имени.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.2.</strong> Товары могут быть новыми или бывшими в употреблении. Состояние каждого товара (новый, бывший в употреблении, имеющиеся недостатки) подробно описано в его карточке на Сайте.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>2.3.</strong> Покупатель соглашается с тем, что в отношении комиссионных товаров, бывших в употреблении, не действует право на обмен и возврат товара надлежащего качества, предусмотренное статьей 25 Закона РФ «О защите прав потребителей». Покупатель осмотрел товар дистанционно (посредством изучения фотографий и описания на Сайте) и принял его состояние.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          3. Порядок оформления заказа и расчетов
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>3.1.</strong> Заказ товара осуществляется Покупателем на Сайте через корзину заказов.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>3.2.</strong> Оплата Заказа производится 100% предоплатой путем безналичного расчета через платежный шлюз Сайта.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>3.3.</strong> Цена товара указывается на Сайте и является фиксированной на момент оформления Заказа.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          4. Возврат товара ненадлежащего качества
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>4.1.</strong> В случае обнаружения Покупателем существенных недостатков товара, которые не были оговорены Продавцом, скрытых дефектов, а также если товару не присуща одна или несколько характеристик, заявленных на Сайте, Покупатель вправе воспользоваться правами, предусмотренными статьей 18 Закона РФ «О защите прав потребителей».
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>4.2.</strong> Требования Покупателя рассматриваются при предъявлении кассового или товарного чека, а также при условии сохранения товарного вида и потребительских свойств товара.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>4.3.</strong> Для разрешения спора о характере выявленных недостатков Продавец вправе провести независимую экспертизу товара за свой счет.
        </p>
        
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(155, 140, 255, 0.1); border-radius: 0.5rem; border-left: 3px solid var(--color-primary);">
          <p style="margin: 0; color: var(--color-muted-foreground); font-size: 0.9375rem;">
            <strong>⚖️ Важное примечание:</strong> Согласно позиции Верховного Суда РФ, даже при наличии в догове ограничивающих условий, потребитель вправе требовать возмещения фактически понесенных продавцом расходов только в случае своего отказа от договора. Установление невозвратной суммы в качестве штрафа недопустимо.
          </p>
        </div>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          5. Доставка
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.1.</strong> Стоимость и сроки доставки согласовываются с Покупателем после оформления Заказа и оплаты Товара.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>5.2.</strong> Риск случайной гибели или повреждения Товара переходит к Покупателю с момента передачи ему Товара и проставления его подписи в документах, подтверждающих доставку.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          6. Персональные данные
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>6.1.</strong> При оформлении Заказа Покупатель предоставляет Оператору персональные данные, необходимые для исполнения договора. Обработка персональных данных осуществляется в соответствии с <a href="#" data-app-action="legal.openPrivacyPolicy" style="color: var(--color-primary, #0055FF); text-decoration: none; border-bottom: 1px solid var(--color-primary, #0055FF);">Политикой обработки персональных данных</a> и <a href="#" data-app-action="legal.openPrivacyConsent" style="color: var(--color-primary, #0055FF); text-decoration: none; border-bottom: 1px solid var(--color-primary, #0055FF);">Согласием на обработку персональных данных</a>.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>6.2.</strong> Оформляя Заказ на Сайте, Покупатель подтверждает, что ознакомлен и согласен с условиями обработки персональных данных.
        </p>
      </section>

      <section style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; margin-top: 1.5rem; color: var(--color-foreground);">
          7. Заключительные положения
        </h3>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>7.1.</strong> Настоящая оферта вступает в силу с момента ее размещения на Сайте и действует до момента ее отзыва Продавцом.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>7.2.</strong> Продавец оставляет за собой право вносить изменения в условия оферты в одностороннем порядке. Все изменения вступают в силу с момента их публикации на Сайте.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>7.3.</strong> К отношениям между Покупателем и Продавцом применяется право Российской Федерации.
        </p>
        
        <p style="margin-bottom: 1rem; color: var(--color-muted-foreground);">
          <strong>7.4.</strong> Все споры разрешаются путем переговоров, а при недостижении согласия — в судебном порядке по месту нахождения Продавца.
        </p>
      </section>
    </div>
  `;
}

/**
 * Регистрация модальных окон для юридических документов
 */
export function registerLegalModals() {
  if (!window.app?.modal) {
    console.error('[legal-modals] app.modal is not initialized');
    return;
  }

  // Регистрируем модальное окно для политики обработки персональных данных
  window.app.modal.register({
    id: 'privacy-policy',
    title: 'Политика обработки персональных данных',
    size: 'large',
    closable: true,
    bodyPadding: 'default',
    footer: 'none',
    body: getPrivacyPolicyContent(),
  });

  // Регистрируем модальное окно для публичной оферты
  window.app.modal.register({
    id: 'public-offer',
    title: 'Публичная оферта',
    size: 'large',
    closable: true,
    bodyPadding: 'default',
    footer: 'none',
    body: getPublicOfferContent(),
  });

  // Регистрируем модальное окно для согласия на обработку персональных данных
  window.app.modal.register({
    id: 'privacy-consent',
    title: 'Согласие на обработку персональных данных',
    size: 'large',
    closable: true,
    bodyPadding: 'default',
    footer: 'none',
    body: getPrivacyConsentContent(),
  });

  // Регистрируем действия через Event Bus для декларативного управления
  registerLegalActions();
}

/**
 * Регистрация действий для открытия legal модальных окон через Event Bus
 */
function registerLegalActions() {
  if (!window.app?.events) {
    console.error('[legal-modals] app.events is not initialized');
    return;
  }

  // Регистрируем действия для открытия legal модальных окон
  window.app.events.register('legal', {
    openPrivacyPolicy: () => {
      if (!window.app?.modal) {
        console.error('[legal-modals] app.modal is not initialized');
        return;
      }
      return window.app.modal.open('privacy-policy');
    },
    openPublicOffer: () => {
      if (!window.app?.modal) {
        console.error('[legal-modals] app.modal is not initialized');
        return;
      }
      return window.app.modal.open('public-offer');
    },
    openPrivacyConsent: () => {
      if (!window.app?.modal) {
        console.error('[legal-modals] app.modal is not initialized');
        return;
      }
      return window.app.modal.open('privacy-consent');
    },
  });
}

/**
 * Открыть модальное окно с политикой обработки персональных данных
 */
export function openPrivacyPolicyModal() {
  if (!window.app?.modal) {
    console.error('[legal-modals] app.modal is not initialized');
    return;
  }
  return window.app.modal.open('privacy-policy');
}

/**
 * Открыть модальное окно с публичной офертой
 */
export function openPublicOfferModal() {
  if (!window.app?.modal) {
    console.error('[legal-modals] app.modal is not initialized');
    return;
  }
  return window.app.modal.open('public-offer');
}

/**
 * Открыть модальное окно с согласием на обработку персональных данных
 */
export function openPrivacyConsentModal() {
  if (!window.app?.modal) {
    console.error('[legal-modals] app.modal is not initialized');
    return;
  }
  return window.app.modal.open('privacy-consent');
}

