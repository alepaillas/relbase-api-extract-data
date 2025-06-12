import type { City } from "../types/city.ts";
import type { Commune } from "../types/commune.ts";
import type { Customer } from "../types/customer.ts";
import type { PaymentType } from "../types/payment_type.ts";
import type { Reference } from "../types/reference.ts";
import type { Seller } from "../types/seller.ts";
import type { User } from "../types/user.ts";

// Cache for storing fetched data to avoid duplicate requests
export const cache: {
    customers: Map<number, Customer>;
    cities: Map<number, City>;
    communes: Map<number, Commune>;
    sellers: Map<number, Seller>;
    paymentTypes: Map<number, PaymentType>;
    users: Map<number, User>;
    references: Map<number, Reference>;
} = {
    customers: new Map(),
    cities: new Map(),
    communes: new Map(),
    sellers: new Map(),
    paymentTypes: new Map(),
    users: new Map(),
    references: new Map(),
};
