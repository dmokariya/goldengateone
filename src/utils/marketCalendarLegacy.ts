// src/utils/marketCalendarLegacy.ts
import { MarketSessionState } from '../types';
import { evaluateMarketCalendar } from './marketCalendar';

export function getMarketSessionState(overrideTime?: Date): {
  state: MarketSessionState;
  istTimeFormatted: string;
  isRegularTradingAllowed: boolean;
  message: string;
} {
  const result = evaluateMarketCalendar(overrideTime);
  return {
    state: result.state,
    istTimeFormatted: result.istTimeFormatted,
    isRegularTradingAllowed: result.isOpen,
    message: result.reason
  };
}
