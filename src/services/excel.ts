import * as XLSX from "xlsx";
import { City } from "../types/city";
import { Commune } from "../types/commune";
import { Customer } from "../types/customer";
import { Dte, DteDetail } from "../types/dte";
import { PaymentType } from "../types/payment_type";
import { Seller } from "../types/seller";
import { User } from "../types/user";
import { cache } from "../utils/cache";

// Save data to Excel with multiple sheets
export function saveToExcel(
    data: Array<
        Dte & {
            details?: DteDetail;
            customer?: Customer;
            city?: City;
            commune?: Commune;
            seller?: Seller;
            payment_type?: PaymentType;
            user?: User;
        }
    >,
    fileName: string
): void {
    const workbook = XLSX.utils.book_new();

    // Create main DTEs sheet with all fields
    const dtesSheet = XLSX.utils.json_to_sheet(
        data.map((dte) => ({
            id: dte.id,
            folio: dte.folio,
            type_document: dte.type_document,
            iva: dte.iva,
            type_document_name: dte.type_document_name,
            sii_status: dte.sii_status,
            sii_status_name: dte.sii_status_name,
            start_date: dte.start_date,
            end_date: dte.end_date,
            pdf_file: dte.pdf_file.url,
            xml_inter_file: dte.xml_inter_file.url,
            customer_id: dte.customer_id,
            customer_name: dte.customer?.name,
            customer_rut: dte.customer?.rut,
            customer_type: dte.customer?.type_customer,
            commune_id: dte.commune_id,
            commune_name: dte.commune?.name,
            city_id: dte.city_id,
            city_name: dte.city?.name,
            address: dte.address,
            type_transfer: dte.type_transfer,
            global_discount: dte.global_discount,
            contact: dte.contact,
            channel_id: dte.channel_id,
            type_payment_id: dte.type_payment_id,
            payment_type_name: dte.payment_type?.name,
            seller_id: dte.seller_id,
            seller_name: dte.seller
                ? `${dte.seller.first_name} ${dte.seller.last_name}`
                : undefined,
            label_value: dte.label_value,
            status: dte.status,
            comment: dte.comment,
            created_at: dte.created_at,
            updated_at: dte.updated_at,
            type_option_ref: dte.type_option_ref,
            track_id: dte.track_id,
            user_id: dte.user_id,
            user_name: dte.user
                ? `${dte.user.first_name} ${dte.user.last_name}`
                : undefined,
            is_load_xml: dte.is_load_xml,
            is_manual: dte.is_manual,
            amount_iva: dte.amount_iva,
            amount_total: dte.amount_total,
            amount_neto: dte.amount_neto,
            amount_tax: dte.amount_tax,
            amount_exempt: dte.amount_exempt,
            unit_cost: dte.unit_cost,
            real_amount_total: dte.real_amount_total,
            real_amount_neto: dte.real_amount_neto,
            real_amount_iva: dte.real_amount_iva,
            real_amount_tax: dte.real_amount_tax,
            real_amount_exempt: dte.real_amount_exempt,
            cash_sale: dte.cash_sale,
            mnt_bruto: dte.mnt_bruto,
            dispatch_address: dte.dispatch_address,
            dispatch_city_id: dte.dispatch_city_id,
            dispatch_commune_id: dte.dispatch_commune_id,
            number_plate: dte.number_plate,
            shipper_rut: dte.shipper_rut,
            driver_rut: dte.driver_rut,
            driver_name: dte.driver_name,
            branch_id: dte.branch_id,
            continuous: dte.continuous,
            addon_centry: dte.addon_centry,
            ware_house_id: dte.ware_house_id,
            change_due: dte.change_due,
            amount_paid: dte.amount_paid,
            logo_propyme: dte.logo_propyme,
            currency: dte.currency,
            type_document_sii: dte.type_document_sii,
            is_stock_sale_note: dte.is_stock_sale_note,
            addon_ecommerce: dte.addon_ecommerce,
            income_type: dte.income_type,
            reject_date: dte.reject_date,
            tpo_tran_venta: dte.tpo_tran_venta,
            tpo_tran_compra: dte.tpo_tran_compra,
            str_commune: dte.str_commune,
            str_city: dte.str_city,
            is_str_address: dte.is_str_address,
            timbre: dte.timbre,
        }))
    );
    XLSX.utils.book_append_sheet(workbook, dtesSheet, "DTEs");

    // Create products sheet with all fields
    const products = data.flatMap((dte) =>
        (dte.details?.products || []).map((product) => ({
            dte_id: dte.id,
            dte_folio: dte.folio,
            product_id: product.product_id,
            name: product.name,
            url_image: product.url_image,
            price: product.price,
            quantity: product.quantity,
            description: product.description,
            discount: product.discount,
            surcharge: product.surcharge,
            unit_item: product.unit_item,
            code: product.code,
            tax_affected: product.tax_affected,
            created_at: product.created_at,
            updated_at: product.updated_at,
            additional_tax_code: product.additional_tax_code,
            additional_tax_fee: product.additional_tax_fee,
            unit_cost: product.unit_cost,
            real_quantity: product.real_quantity,
            real_amount_neto: product.real_amount_neto,
            is_profit: product.is_profit,
            expiration_date: product.expiration_date,
            lot_serial_number_id: product.lot_serial_number_id,
            lot_serial_number: product.lot_serial_number,
            traceability: product.traceability,
        }))
    );

    if (products.length > 0) {
        const productsSheet = XLSX.utils.json_to_sheet(products);
        XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
    }

    // Create emails sheet with all fields
    const emails = data.flatMap((dte) =>
        (dte.details?.emails || []).map((email) => ({
            dte_id: dte.id,
            dte_folio: dte.folio,
            id: email.id,
            e_document_id: email.e_document_id,
            email: email.email,
            created_at: email.created_at,
            updated_at: email.updated_at,
            message: email.message,
            subject: email.subject,
            reminder_id: email.reminder_id,
            company_id: email.company_id,
            business_id: email.business_id,
        }))
    );

    if (emails.length > 0) {
        const emailsSheet = XLSX.utils.json_to_sheet(emails);
        XLSX.utils.book_append_sheet(workbook, emailsSheet, "Emails");
    }

    // Create SII tracks sheet with all fields
    const siiTracks = data.flatMap((dte) =>
        (dte.details?.sii_tracks || []).map((track) => ({
            dte_id: dte.id,
            dte_folio: dte.folio,
            sii_status: track.sii_status,
            note: track.note,
            ws_status: track.ws_status,
            created_at: track.created_at,
            updated_at: track.updated_at,
        }))
    );

    if (siiTracks.length > 0) {
        const siiTracksSheet = XLSX.utils.json_to_sheet(siiTracks);
        XLSX.utils.book_append_sheet(workbook, siiTracksSheet, "SII_Tracks");
    }

    // Create DTE children sheet with all fields
    const dteChildren = data.flatMap((dte) =>
        (dte.details?.dte_children || []).map((child) => ({
            dte_id: dte.id,
            dte_folio: dte.folio,
            id: child.id,
            folio: child.folio,
            type_document: child.type_document,
            type_document_name: child.type_document_name,
        }))
    );

    if (dteChildren.length > 0) {
        const dteChildrenSheet = XLSX.utils.json_to_sheet(dteChildren);
        XLSX.utils.book_append_sheet(workbook, dteChildrenSheet, "DTE_Children");
    }

    // Create Customers sheet
    const customers = Array.from(cache.customers.values()).map((customer) => ({
        id: customer.id,
        type_customer: customer.type_customer,
        rut: customer.rut,
        name: customer.name,
        name_fantasy: customer.name_fantasy,
        address: customer.address,
        business_activity: customer.business_activity,
        city_id: customer.city_id,
        commune_id: customer.commune_id,
        active: customer.active,
        code: customer.code,
        name_payment: customer.name_payment,
        phone_payment: customer.phone_payment,
        email: customer.email.join("; "),
        business_contact: customer.business_contact,
        email_commercial: customer.email_commercial.join("; "),
        phone: customer.phone,
        mobile: customer.mobile,
        reference: customer.reference,
        discount: customer.discount,
        credit: customer.credit,
        type_payment_id: customer.type_payment_id,
        credit_amount: customer.credit_amount,
        is_overdue_invoice: customer.is_overdue_invoice,
        days_overdue: customer.days_overdue,
        price_list_id: customer.price_list_id,
        price_list_name: customer.price_list_name,
        is_price_list_default: customer.is_price_list_default,
        full_address: customer.full_address,
    }));

    if (customers.length > 0) {
        const customersSheet = XLSX.utils.json_to_sheet(customers);
        XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");
    }

    // Create Cities sheet
    const cities = Array.from(cache.cities.values()).map((city) => ({
        id: city.id,
        name: city.name,
    }));

    if (cities.length > 0) {
        const citiesSheet = XLSX.utils.json_to_sheet(cities);
        XLSX.utils.book_append_sheet(workbook, citiesSheet, "Cities");
    }

    // Create Communes sheet
    const communes = Array.from(cache.communes.values()).map((commune) => ({
        id: commune.id,
        name: commune.name,
        city_id: commune.city_id,
    }));

    if (communes.length > 0) {
        const communesSheet = XLSX.utils.json_to_sheet(communes);
        XLSX.utils.book_append_sheet(workbook, communesSheet, "Communes");
    }

    // Create Sellers sheet
    const sellers = Array.from(cache.sellers.values()).map((seller) => ({
        id: seller.id,
        first_name: seller.first_name,
        last_name: seller.last_name,
        role: seller.role,
        profile_id: seller.profile_id,
    }));

    if (sellers.length > 0) {
        const sellersSheet = XLSX.utils.json_to_sheet(sellers);
        XLSX.utils.book_append_sheet(workbook, sellersSheet, "Sellers");
    }

    // Create Payment Types sheet
    const paymentTypes = Array.from(cache.paymentTypes.values()).map(
        (paymentType) => ({
            id: paymentType.id,
            name: paymentType.name,
            fma_pago_sii: paymentType.fma_pago_sii,
            kind_payment: paymentType.kind_payment,
            enabled: paymentType.enabled,
        })
    );

    if (paymentTypes.length > 0) {
        const paymentTypesSheet = XLSX.utils.json_to_sheet(paymentTypes);
        XLSX.utils.book_append_sheet(workbook, paymentTypesSheet, "Payment_Types");
    }

    // Create Users sheet
    const users = Array.from(cache.users.values()).map((user) => ({
        id: user.id,
        branch_id: user.branch_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email,
        token: user.token,
        ware_house_id: user.ware_house_id,
        seller_id: user.seller_id,
        channel_id: user.channel_id,
        type_document_sii: user.type_document_sii,
        type_document_sn: user.type_document_sn,
        type_payment_id: user.type_payment_id,
        type_print_pos: user.type_print_pos,
        ticket: user.ticket,
        is_income_paid: user.is_income_paid,
        comment_estimate: user.comment_estimate,
        comment_sales_note: user.comment_sales_note,
        comment_dte: user.comment_dte,
        charset_id: user.charset_id,
        charset_name: user.charset_name,
        is_mnt_bruto_estimate: user.is_mnt_bruto_estimate,
        ware_house_web_id: user.ware_house_web_id,
        is_owner_warehouse: user.is_owner_warehouse,
    }));

    if (users.length > 0) {
        const usersSheet = XLSX.utils.json_to_sheet(users);
        XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
    }

    // Write the workbook to a file
    XLSX.writeFile(workbook, fileName);
    console.log(`Data saved to ${fileName}`);
}
