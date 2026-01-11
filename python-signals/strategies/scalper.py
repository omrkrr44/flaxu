import pandas as pd

class ScalpStrategy:
    def __init__(self):
        self.PUMP_THRESHOLD = 5.0   # +5%
        self.DUMP_THRESHOLD = -5.0  # -5%

    def analyze(self, symbol: str, current_price: float, price_5m_ago: float):
        """
        Analyze for sudden Pump or Dump
        """
        if price_5m_ago == 0:
            return None

        change_percent = ((current_price - price_5m_ago) / price_5m_ago) * 100
        
        signal = None
        reason = None
        
        # Strategy: FADE the move (Mean Reversion)
        # If Pump (>5%) -> Short
        # If Dump (<-5%) -> Long
        
        if change_percent >= self.PUMP_THRESHOLD:
            signal = 'SHORT'
            reason = f'Pump Detected (+{change_percent:.2f}%)'
        elif change_percent <= self.DUMP_THRESHOLD:
            signal = 'LONG'
            reason = f'Dump Detected ({change_percent:.2f}%)'
            
        if signal:
            return {
                'symbol': symbol,
                'signal': signal,
                'entry_price': current_price,
                'change_24h': change_percent, # Actually 5m change here
                'reason': reason
            }
            
        return None
