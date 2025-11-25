import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      // Auth & Registration
      selectRole: 'Выберите роль',
      client: 'Клиент',
      executor: 'Исполнитель',
      registerClient: 'Регистрация клиента',
      registerExecutor: 'Регистрация исполнителя',
      firstName: 'Имя',
      lastName: 'Фамилия',
      phone: 'Телефон',
      category: 'Категория',
      uploadPhoto: 'Загрузить фото',
      agreeData: 'Соглашаюсь на обработку персональных данных',
      acceptTerms: 'Принимаю условия',
      continue: 'Продолжить',
      register: 'Зарегистрироваться',
      
      // SMS Auth
      smsAuth: 'SMS Авторизация',
      enterSmsCode: 'Введите код из SMS',
      verifyCode: 'Проверить код',
      
      // Navigation
      home: 'Главная',
      orders: 'Заказы',
      profile: 'Профиль',
      chat: 'Чат',
      
      // Orders
      order: 'Заказ',
      createOrder: 'Создать заказ',
      address: 'Адрес',
      description: 'Описание',
      selectDate: 'Выберите дату',
      selectTime: 'Выберите время',
      sendOrder: 'Отправить заказ',
      myOrders: 'Мои заказы',
      activeOrders: 'Активные заказы',
      
      // Payment
      paymentProcessing: 'Оплата...',
      paymentSuccess: 'Оплата успешна',
      paymentFailed: 'Ошибка оплаты',
      
      // Messages
      loading: 'Загрузка...',
      loadingLocation: 'Определяем ваше местоположение...',
      registrationCompleted: 'Регистрация завершена',
      
      // Errors
      errorFillFields: 'Пожалуйста, заполните все поля',
      errorUploadPhoto: 'Загрузите фото',
      errorAcceptTerms: 'Примите условия и согласие',
      errorInvalidPhone: 'Введите корректный номер телефона',
      errorInvalidSms: 'Неверный SMS код',
      permissionGallery: 'Необходимо разрешение на галерею',
      permissionLocation: 'Необходимо разрешение на геолокацию',
      errorImagePicker: 'Ошибка загрузки фото',
      errorPaymentData: 'Ошибка данных оплаты',
      errorLocation: 'Не удалось определить местоположение',
      
      // Categories
      plumber: 'Сантехник',
      electrician: 'Электрик',
      cleaner: 'Уборщик',
      carpenter: 'Плотник',
      painter: 'Маляр',
      locksmith: 'Слесарь',
      
      // Actions
      search: 'Поиск',
      filter: 'Фильтр',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      
      // Professional
      rating: 'Рейтинг',
      reviews: 'Отзывы',
      experience: 'Опыт',
      pricePerHour: 'Цена/час',
      orderService: 'Заказать услугу',
      
      // Settings
      settings: 'Настройки',
      language: 'Язык',
      notifications: 'Уведомления',
      logout: 'Выйти',
      openSettings: 'Открыть настройки',
      
      // Status
      pending: 'В ожидании',
      accepted: 'Принят',
      inProgress: 'В работе',
      completed: 'Завершён',
      cancelled: 'Отменён'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
