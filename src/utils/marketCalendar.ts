// src/utils/marketCalendar.ts
// Official Indian NSE/BSE Trading Holidays & Live IST Session Architecture (Client & Shared)

import { IndianHoliday, MarketCalendarStatus, MarketSessionState, TimeOfDayBucket } from '../types';

export const INDIAN_TRADING_HOLIDAYS: IndianHoliday[] = [
  // 2026 Holidays
  { date: '2026-01-26', name: 'Republic Day', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-02-17', name: 'Mahashivratri', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-03-04', name: 'Holi', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-03-20', name: 'Id-Ul-Fitr (Ramzan Eid)', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-03-27', name: 'Ram Navami', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-03-31', name: 'Mahavir Jayanti', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-04-03', name: 'Good Friday', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-04-14', name: 'Dr. Baba Saheb Ambedkar Jayanti', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-05-01', name: 'Maharashtra Day', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-05-27', name: 'Bakri Id (Id-Ul-Zuha)', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-06-26', name: 'Muharram', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-08-15', name: 'Independence Day', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-08-27', name: 'Milad-un-Nabi', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-10-20', name: 'Dussehra', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-11-08', name: 'Diwali Laxmi Pujan (Muhurat Trading only)', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-11-10', name: 'Diwali Balipratipada', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', exchange: 'ALL', isTradingHoliday: true },
  { date: '2026-12-25', name: 'Christmas', exchange: 'ALL', isTradingHoliday: true },

  // 2027 Holidays
  { date: '2027-01-26', name: 'Republic Day', exchange: 'ALL', isTradingHoliday: true },
  { date: '2027-03-08', name: 'Mahashivratri', exchange: 'ALL', isTradingHoliday: true },
  { date: '2027-03-23', name: 'Holi', exchange: 'ALL', isTradingHoliday: true },
  { date: '2027-03-26', name: 'Good Friday', exchange: 'ALL', isTradingHoliday: true }
];

export function getTodayISTDateString(overrideDate?: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(overrideDate || new Date());
}

export function evaluateMarketCalendar(overrideDate?: Date): MarketCalendarStatus {
  const now = overrideDate || new Date();
  const dateStr = getTodayISTDateString(now);

  const istString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const [hStr, mStr] = istString.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const timeNum = h * 100 + m;

  const istDayStr = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  });

  const isWeekend = istDayStr === 'Sat' || istDayStr === 'Sun';
  const holiday = INDIAN_TRADING_HOLIDAYS.find(h => h.date === dateStr && h.isTradingHoliday);

  if (isWeekend) {
    return {
      isOpen: false,
      state: 'CLOSED',
      timeOfDayBucket: 'MARKET_CLOSED',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST (${istDayStr})`,
      currentDateIST: dateStr,
      reason: `Exchange Closed for Weekend (${istDayStr})`
    };
  }

  if (holiday) {
    return {
      isOpen: false,
      state: 'CLOSED',
      timeOfDayBucket: 'MARKET_CLOSED',
      isHoliday: true,
      holidayName: holiday.name,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: `NSE/BSE Exchange Holiday: ${holiday.name}`
    };
  }

  if (timeNum >= 900 && timeNum < 915) {
    return {
      isOpen: false,
      state: 'PREOPEN',
      timeOfDayBucket: 'PRE_OPEN',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Pre-Open Discovery Session (09:00 - 09:15 IST)'
    };
  }

  if (timeNum >= 915 && timeNum < 925) {
    return {
      isOpen: true,
      state: 'OPEN',
      timeOfDayBucket: 'OPENING_DISCOVERY',
      isHoliday: false,
      isOpeningFilterActive: true,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Opening Volatility Discovery (09:15 - 09:25 IST). Volatility filter active.'
    };
  }

  if (timeNum >= 925 && timeNum < 1045) {
    return {
      isOpen: true,
      state: 'OPEN',
      timeOfDayBucket: 'MORNING_TREND',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Morning Trend Session Active (09:25 - 10:45 IST)'
    };
  }

  if (timeNum >= 1045 && timeNum < 1330) {
    return {
      isOpen: true,
      state: 'OPEN',
      timeOfDayBucket: 'MIDDAY_CHOP',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Midday Chop & Rangebound Session (10:45 - 13:30 IST)'
    };
  }

  if (timeNum >= 1330 && timeNum < 1445) {
    return {
      isOpen: true,
      state: 'OPEN',
      timeOfDayBucket: 'AFTERNOON_MOMENTUM',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: false,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Afternoon Momentum Session (13:30 - 14:45 IST)'
    };
  }

  if (timeNum >= 1445 && timeNum < 1515) {
    return {
      isOpen: true,
      state: 'OPEN',
      timeOfDayBucket: 'CLOSING_EOD',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: true,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'EOD Entry Cutoff (14:45 - 15:15 IST). New intraday entries blocked.'
    };
  }

  if (timeNum >= 1515 && timeNum < 1530) {
    return {
      isOpen: false,
      state: 'CLOSING',
      timeOfDayBucket: 'CLOSING_EOD',
      isHoliday: false,
      isOpeningFilterActive: false,
      isEodCutoffActive: true,
      istTimeFormatted: `${istString} IST`,
      currentDateIST: dateStr,
      reason: 'Closing & Broker MIS Auto-Squareoff (15:15 - 15:30 IST)'
    };
  }

  return {
    isOpen: false,
    state: 'CLOSED',
    timeOfDayBucket: 'MARKET_CLOSED',
    isHoliday: false,
    isOpeningFilterActive: false,
    isEodCutoffActive: false,
    istTimeFormatted: `${istString} IST`,
    currentDateIST: dateStr,
    reason: 'Market Closed (After-Market Hours)'
  };
}
