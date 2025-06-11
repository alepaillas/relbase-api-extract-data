import { City } from "../types/city";
import { Commune } from "../types/commune";
import { Customer } from "../types/customer";
import { PaymentType } from "../types/payment_type";
import { Seller } from "../types/seller";
import { User } from "../types/user";

// Cache for storing fetched data to avoid duplicate requests
export const cache: {
    customers: Map<number, Customer>;
    cities: Map<number, City>;
    communes: Map<number, Commune>;
    sellers: Map<number, Seller>;
    paymentTypes: Map<number, PaymentType>;
    users: Map<number, User>;
} = {
    customers: new Map(),
    cities: new Map(),
    communes: new Map(),
    sellers: new Map(),
    paymentTypes: new Map(),
    users: new Map(),
};
