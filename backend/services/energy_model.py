# backend/services/energy_model.py
class WasteToEnergyModel:
    def __init__(self):
        self.hhv_map = {
            'PET': 43.448, 'HDPE': 47.22, 'PP': 46.68, 'PVC': 25.0,
            'LDPE': 46.0, 'PS': 41.0, 'Paper': 15.894, 'Cardboard': 15.894,
            'Textile': 20.162, 'Wood': 19.464, 'Food waste': 15.386,
            'Organic': 15.386, 'Metal': 0.0, 'Glass': 0.0, 'Unknown': 20.0
        }
        self.co2_map = {
            'PET': 2.5, 'HDPE': 2.8, 'PP': 2.7, 'PVC': 1.8,
            'LDPE': 2.6, 'PS': 2.4, 'Paper': 1.2, 'Cardboard': 1.2,
            'Textile': 1.5, 'Wood': 1.0, 'Food waste': 0.8,
            'Organic': 0.8, 'Metal': 0.5, 'Glass': 0.3, 'Unknown': 1.5
        }

    def predict(self, waste_type, weight_kg):
        base = waste_type.split()[0] if waste_type else 'Unknown'
        hhv = self.hhv_map.get(base, 20.0)
        energy_mj = hhv * weight_kg
        energy_kwh = (energy_mj / 3.6) * 0.25  # 25% efficiency
        co2_saved = self.co2_map.get(base, 1.5) * weight_kg
        return round(energy_kwh, 2), round(co2_saved, 2)

energy_model = WasteToEnergyModel()