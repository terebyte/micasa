import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Korean-first UI. All user-facing strings live here, never hardcoded.
const resources = {
  ko: {
    translation: {
      app: { title: 'micasa', subtitle: '우리집' },
      nav: { appliances: '가전' },
      common: {
        add: '추가',
        edit: '수정',
        delete: '삭제',
        cancel: '취소',
        save: '저장',
        confirmDelete: '정말 삭제할까요?',
        loading: '불러오는 중...',
        error: '문제가 발생했어요',
        retry: '다시 시도',
        empty: '아직 항목이 없어요',
        required: '필수 입력이에요',
        darkMode: '다크 모드',
      },
      appliance: {
        title: '가전',
        addTitle: '가전 추가',
        editTitle: '가전 수정',
        name: '이름',
        namePlaceholder: '예: 세탁기',
        brand: '브랜드',
        brandPlaceholder: '예: LG',
        location: '위치',
        locationPlaceholder: '예: 베란다',
        modelNumber: '모델명',
        serialNumber: '시리얼 번호',
        purchaseDate: '구매일',
        notes: '메모',
        emptyHint: '오른쪽 위 추가 버튼으로 첫 가전을 등록해 보세요',
      },
    },
  },
  en: {
    translation: {
      app: { title: 'micasa', subtitle: 'our home' },
      nav: { appliances: 'Appliances' },
      common: {
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        cancel: 'Cancel',
        save: 'Save',
        confirmDelete: 'Delete this item?',
        loading: 'Loading...',
        error: 'Something went wrong',
        retry: 'Retry',
        empty: 'Nothing here yet',
        required: 'Required',
        darkMode: 'Dark mode',
      },
      appliance: {
        title: 'Appliances',
        addTitle: 'Add appliance',
        editTitle: 'Edit appliance',
        name: 'Name',
        namePlaceholder: 'e.g. Washer',
        brand: 'Brand',
        brandPlaceholder: 'e.g. LG',
        location: 'Location',
        locationPlaceholder: 'e.g. Balcony',
        modelNumber: 'Model number',
        serialNumber: 'Serial number',
        purchaseDate: 'Purchase date',
        notes: 'Notes',
        emptyHint: 'Use the add button to register your first appliance',
      },
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
