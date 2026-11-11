# MongoDB data dictionary

Generated from current Mongoose schemas, 11 November 2026. See Database.docx for transaction and interpretation notes.

## Cart (`carts`)

Indexes: `[[{"customer":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| customer | ObjectId | required; ref=User |
| items | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Category (`categories`)

Indexes: `[[{"name":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| name | String | required |
| icon | String | optional / schema default |
| description | String | optional / schema default |
| imageUrl | String | optional / schema default |
| image_url | String | optional / schema default |
| status | String | enum=['ACTIVE', 'INACTIVE'] |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## CustomerReview (`customerreviews`)

Indexes: `[[{"submissionKey":1},{"unique":true,"partialFilterExpression":{"submissionKey":{"$type":"string"}}}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| customer | ObjectId | required; ref=User |
| order | ObjectId | ref=Order |
| issueType | String | required; enum=['RATING', 'COMPLAINT'] |
| rating | Number | min=1; max=5 |
| topic | String | optional / schema default |
| content | String | required |
| attachments | Array | optional / schema default |
| status | String | enum=['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] |
| adminResponse | String | optional / schema default |
| respondedAt | Date | optional / schema default |
| respondedBy | ObjectId | ref=User |
| submissionKey | String | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## DeliveryArea (`deliveryareas`)

Indexes: `[[{"district":1},{"unique":true}],[{"isActive":1},{}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| district | String | required |
| deliveryFee | Number | required; max=1000000 |
| isActive | Boolean | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## DeliveryIssue (`deliveryissues`)

Indexes: `[[{"order":1},{}],[{"reporter":1},{}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| order | ObjectId | required; ref=Order |
| reporter | ObjectId | required; ref=User |
| issueType | String | required; enum=['UNREACHABLE', 'BAD_ADDRESS', 'REFUSED', 'DAMAGED', 'DELAY', 'OTHER'] |
| description | String | required |
| outcome | String | required; enum=['REPORT', 'RETURN', 'CANCEL'] |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Ingredient (`ingredients`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| supplier | ObjectId | ref=Supplier |
| name | String | required |
| isActive | Boolean | optional / schema default |
| unit | String | required |
| currentStock | Number | optional / schema default |
| minStockLevel | Number | optional / schema default |
| stockLots | Array | embedded=True |
| lotsVersion | Number | optional / schema default |
| stockValuation.quantity | Number | optional / schema default |
| stockValuation.totalCost | Number | optional / schema default |
| stockValuation.updatedAt | Date | optional / schema default |
| stockValuation.updatedBy | ObjectId | ref=User |
| _id | ObjectId | optional / schema default |

## InventoryTransaction (`inventorytransactions`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| ingredient | ObjectId | required; ref=Ingredient |
| transactionType | String | required; enum=['IN_PURCHASE', 'OUT_ORDER', 'ADJUSTMENT', 'SPOILAGE'] |
| quantity | Number | required |
| stockBefore | Number | optional / schema default |
| stockAfter | Number | optional / schema default |
| unitBefore | String | optional / schema default |
| unitAfter | String | optional / schema default |
| valueBefore | Number | optional / schema default |
| valueAfter | Number | optional / schema default |
| stockDelta | Number | required |
| referenceType | String | enum=['ORDER', 'PURCHASE_ORDER', 'ADJUSTMENT'] |
| referenceId | Mixed | optional / schema default |
| note | String | optional / schema default |
| createdBy | ObjectId | ref=User |
| costTotal | Number | optional / schema default |
| lotAllocations | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## LoyaltyTransaction (`loyaltytransactions`)

Indexes: `[[{"order":1},{"unique":true,"partialFilterExpression":{"automatic":true}}],[{"order":1},{"name":"order_redemption_refund","unique":true,"partialFilterExpression":{"redemptionRefund":true}}],[{"order":1},{"name":"order_earning_reversal","unique":true,"partialFilterExpression":{"earningReversal":true}}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| customer | ObjectId | required; ref=User |
| order | ObjectId | ref=Order |
| pointsChange | Number | required |
| balanceAfter | Number | optional / schema default |
| automatic | Boolean | optional / schema default |
| redemptionRefund | Boolean | optional / schema default |
| earningReversal | Boolean | optional / schema default |
| transactionType | String | required; enum=['EARN', 'REDEEM', 'REFUND', 'ADJUST'] |
| reason | String | optional / schema default |
| performedBy | ObjectId | ref=User |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Order (`orders`)

Indexes: `[[{"orderCode":1},{"unique":true}],[{"customer":1,"idempotencyKey":1},{"unique":true,"partialFilterExpression":{"idempotencyKey":{"$type":"string"}}}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| mutationLock | String | optional / schema default |
| orderCode | String | required |
| checkoutFlow | Boolean | optional / schema default |
| checkoutSessionId | String | optional / schema default |
| idempotencyKey | String | optional / schema default |
| requestHash | String | optional / schema default |
| cartClearedAt | Date | optional / schema default |
| customer | ObjectId | ref=User |
| cashier | ObjectId | ref=User |
| voucher | ObjectId | ref=Voucher |
| reward | ObjectId | ref=RewardItem |
| pointsRedeemed | Number | optional / schema default |
| orderType | String | required; enum=['DINE_IN', 'TAKEAWAY', 'ONLINE'] |
| status | String | enum=['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'] |
| items | Array | embedded=True |
| totalAmount | Number | required |
| discountAmount | Number | optional / schema default |
| deliveryFee | Number | optional / schema default |
| finalAmount | Number | required |
| paymentMethod | String | enum=['COD', 'PAY_AT_COUNTER', 'CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'] |
| demoProvider | String | enum=['MOMO', 'VNPAY', 'BANK_TRANSFER'] |
| recipientName | String | optional / schema default |
| recipientPhone | String | optional / schema default |
| deliveryAddress | String | optional / schema default |
| district | String | optional / schema default |
| ward | String | optional / schema default |
| addressDetail | String | optional / schema default |
| shipper | ObjectId | ref=User |
| delivery.status | String | enum=['ASSIGNED', 'ACCEPTED', 'DELIVERING', 'DELIVERED', 'RETURNED', 'CANCELLED'] |
| delivery.assignedAt | Date | optional / schema default |
| delivery.acceptedAt | Date | optional / schema default |
| delivery.pickedUpAt | Date | optional / schema default |
| delivery.deliveredAt | Date | optional / schema default |
| delivery.history | Array | embedded=True |
| tableNumber | String | optional / schema default |
| orderNote | String | optional / schema default |
| cancelReason | String | optional / schema default |
| inventoryDeductedAt | Date | optional / schema default |
| inventoryProcessing | Boolean | optional / schema default |
| costTotal | Number | optional / schema default |
| costCapturedAt | Date | optional / schema default |
| costStatus | String | enum=['PENDING', 'COMPLETE', 'MISSING_PRICE', 'LEGACY'] |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## OrderItem (`orderitems`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| order | ObjectId | ref=Order |
| product | ObjectId | required; ref=Product |
| productNameAtTime | String | required |
| unitPrice | Number | required |
| customization | Mixed | optional / schema default |
| quantity | Number | required; min=1 |
| subtotal | Number | required |
| isPrepared | Boolean | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## PasswordRecovery (`passwordrecoveries`)

Indexes: `[[{"email":1},{"unique":true}],[{"expiresAt":1},{"expireAfterSeconds":0}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| email | String | required |
| user | ObjectId | required; ref=User |
| challenge | String | required |
| otpHash | String | required |
| resetTokenHash | String | optional / schema default |
| attempts | Number | optional / schema default |
| sentAt | Date | required |
| expiresAt | Date | required |
| _id | ObjectId | optional / schema default |

## Payment (`payments`)

Indexes: `[[{"status":1,"paymentMethod":1,"paidAt":1},{}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| order | ObjectId | required; ref=Order |
| paymentMethod | String | required; enum=['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'] |
| demoProvider | String | enum=['MOMO', 'VNPAY', 'BANK_TRANSFER'] |
| transactionCode | String | optional / schema default |
| amount | Number | required |
| status | String | enum=['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] |
| paidAt | Date | optional / schema default |
| receivedAmount | Number | optional / schema default |
| changeAmount | Number | optional / schema default |
| refundedAt | Date | optional / schema default |
| refundAmount | Number | optional / schema default |
| refundMethod | String | enum=['CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'DEMO_ONLINE'] |
| refundReference | String | optional / schema default |
| refundNote | String | optional / schema default |
| refundedBy | ObjectId | ref=User |
| refundSchedule | ObjectId | ref=WorkSchedule |
| receivedBy | ObjectId | ref=User |
| remittanceId | String | optional / schema default |
| remittanceSchedule | ObjectId | ref=WorkSchedule |
| remittedAt | Date | optional / schema default |
| paymentNote | String | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Product (`products`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| category | ObjectId | required; ref=Category |
| name | String | required |
| basePrice | Number | required |
| badge | String | optional / schema default |
| subtitle | String | optional / schema default |
| variantsConfig | Mixed | optional / schema default |
| description | String | optional / schema default |
| imageUrl | String | optional / schema default |
| isAvailable | Boolean | optional / schema default |
| recipe | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## ProductIngredient (`productingredients`)

Indexes: `[[{"product":1,"ingredient":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| product | ObjectId | required; ref=Product |
| ingredient | ObjectId | required; ref=Ingredient |
| quantityRequired | Number | required; min=0.001 |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## PurchaseOrder (`purchaseorders`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| supplier | ObjectId | required; ref=Supplier |
| creator | ObjectId | required; ref=User |
| totalCost | Number | optional / schema default |
| status | String | enum=['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] |
| note | String | optional / schema default |
| items | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## PurchaseOrderItem (`purchaseorderitems`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| purchaseOrder | ObjectId | ref=PurchaseOrder |
| ingredient | ObjectId | required; ref=Ingredient |
| quantity | Number | required; min=0.001 |
| unitPrice | Number | required |
| totalCost | Number | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## RestockRequest (`restockrequests`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| requester | ObjectId | required; ref=User |
| reviewer | ObjectId | ref=User |
| status | String | required; enum=['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'] |
| reason | String | optional / schema default |
| note | String | optional / schema default |
| reviewNote | String | optional / schema default |
| reviewedAt | Date | optional / schema default |
| history | Array | embedded=True |
| items | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## RewardItem (`rewarditems`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| name | String | required |
| description | String | optional / schema default |
| pointsCost | Number | required |
| discountValue | Number | optional / schema default |
| minOrderValue | Number | optional / schema default |
| validDays | Number | optional / schema default |
| category | String | optional / schema default |
| imageIcon | String | optional / schema default |
| stock | Number | optional / schema default |
| status | String | enum=['ACTIVE', 'INACTIVE'] |
| _id | ObjectId | optional / schema default |

## ShiftHandover (`shifthandovers`)

Indexes: `[[{"schedule":1},{"unique":true}],[{"cashier":1,"workDate":1},{}],[{"status":1},{}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| schedule | ObjectId | required; ref=WorkSchedule |
| cashier | ObjectId | required; ref=User |
| workDate | Date | required |
| shiftName | String | required |
| checkInTime | Date | optional / schema default |
| checkOutTime | Date | optional / schema default |
| openingCash | Number | required |
| cashSales | Number | required |
| codReceipts | Number | optional / schema default |
| cashRefunds | Number | optional / schema default |
| expectedCash | Number | required |
| actualCash | Number | required |
| difference | Number | required |
| note | String | optional / schema default |
| status | String | required; enum=['SUBMITTED', 'CONFIRMED', 'REJECTED'] |
| reviewedBy | ObjectId | ref=User |
| reviewedAt | Date | optional / schema default |
| reviewerNote | String | optional / schema default |
| resubmittedAt | Date | optional / schema default |
| revision | Number | optional / schema default |
| history | Array | embedded=True |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## ShopSetting (`shopsettings`)

Indexes: `[[{"settingKey":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| settingKey | String | required |
| settingValue | String | required |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Supplier (`suppliers`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| name | String | required |
| phone | String | optional / schema default |
| address | String | optional / schema default |
| status | String | enum=['ACTIVE', 'INACTIVE'] |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## User (`users`)

Indexes: `[[{"phone":1},{"unique":true}],[{"emailKey":1},{"unique":true,"partialFilterExpression":{"emailKey":{"$type":"string"}}}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| fullName | String | required |
| phone | String | required |
| email | String | optional / schema default |
| emailKey | String | optional / schema default |
| passwordHash | String | required |
| passwordChangedAt | Date | optional / schema default |
| checkoutRevision | Number | optional / schema default |
| birthday | Date | optional / schema default |
| address | String | optional / schema default |
| role | String | enum=['ADMIN', 'STAFF', 'CUSTOMER'] |
| status | String | enum=['ACTIVE', 'INACTIVE', 'LOCKED'] |
| position | String | enum=['MANAGER', 'BARISTA', 'CASHIER', 'SHIPPER'] |
| baseSalary | Number | optional / schema default |
| hireDate | Date | optional / schema default |
| totalPoints | Number | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## UserReward (`userrewards`)

Indexes: `[]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| customer | ObjectId | required; ref=User |
| reward | ObjectId | required; ref=RewardItem |
| voucher | ObjectId | ref=Voucher |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## Voucher (`vouchers`)

Indexes: `[[{"code":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| code | String | required |
| customer | ObjectId | ref=User |
| discountType | String | required; enum=['PERCENT', 'FIXED_AMOUNT'] |
| discountValue | Number | required |
| minOrderValue | Number | optional / schema default |
| maxDiscount | Number | optional / schema default |
| startDate | Date | optional / schema default |
| validUntil | Date | optional / schema default |
| usageLimit | Number | optional / schema default |
| usedCount | Number | optional / schema default |
| status | String | enum=['ACTIVE', 'INACTIVE'] |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## WorkSchedule (`workschedules`)

Indexes: `[[{"user":1,"workDate":1,"shiftName":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| user | ObjectId | required; ref=User |
| workDate | Date | required |
| shiftName | String | required |
| shift | ObjectId | ref=WorkShift |
| checkInTime | Date | optional / schema default |
| checkOutTime | Date | optional / schema default |
| startingCash | Number | optional / schema default |
| endingCashSystem | Number | optional / schema default |
| endingCashActual | Number | optional / schema default |
| handoverCashSales | Number | optional / schema default |
| handoverPaymentCount | Number | optional / schema default |
| handoverUnattributedCash | Number | optional / schema default |
| handoverUnattributedCount | Number | optional / schema default |
| handoverAt | Date | optional / schema default |
| remittanceId | String | optional / schema default |
| codPaymentIds | Array | optional / schema default |
| codReceivedBy | ObjectId | ref=User |
| codReceivedAt | Date | optional / schema default |
| codReceivedAmount | Number | optional / schema default |
| codReceivedNote | String | optional / schema default |
| codReceivingSchedule | ObjectId | ref=WorkSchedule |
| codLedgerVersion | Number | optional / schema default |
| handoverCodReceipts | Number | optional / schema default |
| handoverCashRefunds | Number | optional / schema default |
| handoverNote | String | optional / schema default |
| status | String | enum=['SCHEDULED', 'PRESENT', 'ABSENT', 'COMPLETED'] |
| note | String | optional / schema default |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |

## WorkShift (`workshifts`)

Indexes: `[[{"weekStart":1,"shiftName":1},{"unique":true}]]`

| Field | Type | Constraints / reference |
| --- | --- | --- |
| weekStart | Date | required |
| shiftName | String | required |
| startTime | String | required |
| endTime | String | required |
| _id | ObjectId | optional / schema default |
| createdAt | Date | optional / schema default |
| updatedAt | Date | optional / schema default |