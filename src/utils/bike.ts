import { Vehicle } from "../modules/bike/bike.model.ts";

export function updateCounters(vehicles: Vehicle[]) {
  const counters = {
    total: vehicles.length,
    available: 0,
    rented: 0,
    maintenance: 0,
    inactive: 0,
  };

  vehicles.forEach((vehicle) => {
    const status = vehicle.status.toLowerCase() as keyof Omit<
      typeof counters,
      "total"
    >;
    if (status in counters) {
      counters[status]++;
    }
  });

  return counters;
}
