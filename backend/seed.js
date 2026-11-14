const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { EJSON } = require('bson');
const { passwordError } = require('./utils/passwordPolicy');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

// BEGIN EMBEDDED SEED DATA
const seedData = {
  "formatVersion": {
    "$numberInt": "1"
  },
  "exportedAt": "2026-11-14T09:20:20.149Z",
  "sourceDatabase": "aura_cafe_erp",
  "notes": "Real password hashes and password recovery sessions are excluded. Seeded accounts use SEED_USER_PASSWORD.",
  "collections": [
    {
      "name": "carts",
      "indexes": [
        {
          "key": {
            "customer": {
              "$numberInt": "1"
            }
          },
          "name": "customer_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb714da36ee97a5e1ec92c"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "__v": {
            "$numberInt": "2"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793814861212"
            }
          },
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95e"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "size": "M",
              "customization": {
                "size": "M"
              },
              "checked": true
            }
          ],
          "updatedAt": {
            "$date": {
              "$numberLong": "1793818017957"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef256b3ee6efe657bb08b2"
          },
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "__v": {
            "$numberInt": "1"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057579357"
            }
          },
          "items": [],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794424831652"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4adfed60c6951bf82d07e"
          },
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "__v": {
            "$numberInt": "2"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794420222474"
            }
          },
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab955"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "size": "M",
              "customization": {
                "size": "M"
              },
              "checked": true
            }
          ],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468002376"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af81a3bb0e512eb7100cd8a"
          },
          "customer": {
            "$oid": "6af81a2b71c9bfcf1909e059"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794644539943"
            }
          },
          "items": [],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794644539943"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af81dd1b0e512eb7100cd8b"
          },
          "customer": {
            "$oid": "6af81dbe69de2b6fbbb5e754"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794645457237"
            }
          },
          "items": [],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794645457237"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af820ffb0e512eb7100cd8c"
          },
          "customer": {
            "$oid": "6af820f7aa6774a3bac09320"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794646271811"
            }
          },
          "items": [],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794646271811"
            }
          }
        }
      ]
    },
    {
      "name": "categories",
      "indexes": [
        {
          "key": {
            "name": {
              "$numberInt": "1"
            }
          },
          "name": "name_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94e"
          },
          "name": "C├á ph├¬ m├íy",
          "icon": "coffee_maker",
          "description": "Espresso, Caramel Macchiato ─æß║¡m ─æ├á chuß║⌐n gu hiß╗çn ─æß║íi.",
          "imageUrl": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94f"
          },
          "name": "C├á ph├¬ truyß╗ün thß╗æng",
          "icon": "local_cafe",
          "description": "C├á ph├¬ muß╗æi, sß╗»a ─æ├í S├ái G├▓n ß╗º phin nguy├¬n bß║ún ngß╗ìt ├¬m.",
          "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab950"
          },
          "name": "Tr├á tr├íi c├óy",
          "icon": "emoji_food_beverage",
          "description": "Tr├á ─æ├áo cam sß║ú, hoa quß║ú nhiß╗çt ─æß╗¢i t╞░╞íi m├ít thanh nhiß╗çt.",
          "imageUrl": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab951"
          },
          "name": "─É├í xay & Matcha",
          "icon": "icecream",
          "description": "Matcha Uji th╞ím b├╣i, ─æ├í xay m├ít lß║ính ─æ├ính tan ng├áy h├¿.",
          "imageUrl": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab952"
          },
          "name": "B├ính ngß╗ìt",
          "icon": "bakery_dining",
          "description": "B├ính Croissant n╞░ß╗¢ng b╞í Ph├íp, cheesecake mß╗üm b├⌐o hß║Ñp dß║½n.",
          "imageUrl": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab953"
          },
          "name": "─É├│ng chai",
          "icon": "liquor",
          "description": "Cold brew ß╗º lß║ính 16h ─æ├│ng chai tiß╗çn lß╗úi mang ─æi bß║Ñt cß╗⌐ ─æ├óu.",
          "imageUrl": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272782"
            }
          }
        }
      ]
    },
    {
      "name": "customerreviews",
      "indexes": [
        {
          "key": {
            "submissionKey": {
              "$numberInt": "1"
            }
          },
          "name": "submissionKey_1",
          "unique": true,
          "partialFilterExpression": {
            "submissionKey": {
              "$type": "string"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b9"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "issueType": "RATING",
          "rating": {
            "$numberInt": "5"
          },
          "content": "Good coffee and friendly service",
          "attachments": [],
          "status": "RESOLVED",
          "adminResponse": "Thank you for your feedback",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ba"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "issueType": "COMPLAINT",
          "content": "Delivery took longer than expected",
          "attachments": [],
          "status": "PENDING",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9bb"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "issueType": "RATING",
          "rating": {
            "$numberInt": "4"
          },
          "content": "Good taste, but a little too sweet",
          "attachments": [],
          "status": "PENDING",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272915"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2a8aa1886f9b5766d179"
          },
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "order": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "issueType": "RATING",
          "rating": {
            "$numberInt": "5"
          },
          "content": "Ngon luôn",
          "attachments": [],
          "status": "PENDING",
          "submissionKey": "6aef2566965dbc8f45a5c451:6aef2581965dbc8f45a5c454",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058890866"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058890866"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af5688a1303905617b70c12"
          },
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "order": {
            "$oid": "6af568011303905617b70bc7"
          },
          "issueType": "RATING",
          "rating": {
            "$numberInt": "5"
          },
          "content": "ngon",
          "attachments": [],
          "status": "RESOLVED",
          "submissionKey": "6af4adf04c7b6bf45fbf1621:6af568011303905617b70bc7",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467978571"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468451534"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "adminResponse": "cảm ơn quý khách",
          "respondedAt": {
            "$date": {
              "$numberLong": "1794468451534"
            }
          },
          "respondedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          }
        }
      ]
    },
    {
      "name": "deliveryareas",
      "indexes": [
        {
          "key": {
            "district": {
              "$numberInt": "1"
            }
          },
          "name": "district_1",
          "unique": true
        },
        {
          "key": {
            "isActive": {
              "$numberInt": "1"
            }
          },
          "name": "isActive_1"
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aec22d477176890d25d0896"
          },
          "district": "Cầu Giấy",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308724"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308724"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d0897"
          },
          "district": "Ba Đình",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308725"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308725"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d0898"
          },
          "district": "Hoàn Kiếm",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308725"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308725"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d0899"
          },
          "district": "Đống Đa",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089a"
          },
          "district": "Hai Bà Trưng",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089b"
          },
          "district": "Tây Hồ",
          "deliveryFee": {
            "$numberInt": "20000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089c"
          },
          "district": "Thanh Xuân",
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089d"
          },
          "district": "Hoàng Mai",
          "deliveryFee": {
            "$numberInt": "22000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089e"
          },
          "district": "Long Biên",
          "deliveryFee": {
            "$numberInt": "25000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d089f"
          },
          "district": "Nam Từ Liêm",
          "deliveryFee": {
            "$numberInt": "20000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d08a0"
          },
          "district": "Bắc Từ Liêm",
          "deliveryFee": {
            "$numberInt": "22000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308726"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aec22d477176890d25d08a1"
          },
          "district": "Hà Đông",
          "deliveryFee": {
            "$numberInt": "25000"
          },
          "isActive": true,
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793860308727"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793860308727"
            }
          }
        }
      ]
    },
    {
      "name": "ingredients",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "name": "Coffee beans",
          "unit": "gram",
          "currentStock": {
            "$numberInt": "9820"
          },
          "minStockLevel": {
            "$numberInt": "2000"
          },
          "lotsVersion": {
            "$numberInt": "7"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "10000"
              },
              "remainingQuantity": {
                "$numberInt": "9820"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c457"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Fresh milk",
          "unit": "ml",
          "currentStock": {
            "$numberInt": "19540"
          },
          "minStockLevel": {
            "$numberInt": "5000"
          },
          "lotsVersion": {
            "$numberInt": "2"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "20000"
              },
              "remainingQuantity": {
                "$numberInt": "19540"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef27ad965dbc8f45a5c487"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Peach syrup",
          "unit": "ml",
          "currentStock": {
            "$numberInt": "4910"
          },
          "minStockLevel": {
            "$numberInt": "1000"
          },
          "lotsVersion": {
            "$numberInt": "2"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "5000"
              },
              "remainingQuantity": {
                "$numberInt": "4910"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c45a"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Black tea",
          "unit": "gram",
          "currentStock": {
            "$numberInt": "6970"
          },
          "minStockLevel": {
            "$numberInt": "1500"
          },
          "lotsVersion": {
            "$numberInt": "3"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "8000"
              },
              "remainingQuantity": {
                "$numberInt": "6970"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c45d"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab967"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Tapioca pearls",
          "unit": "gram",
          "currentStock": {
            "$numberInt": "4000"
          },
          "minStockLevel": {
            "$numberInt": "1000"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab962"
          },
          "name": "Cheesecake slice",
          "unit": "piece",
          "currentStock": {
            "$numberInt": "1050"
          },
          "minStockLevel": {
            "$numberInt": "5"
          },
          "lotsVersion": {
            "$numberInt": "2"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "30"
              },
              "remainingQuantity": {
                "$numberInt": "30"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af5692f1303905617b70d87"
              }
            },
            {
              "sourceType": "PURCHASE",
              "sourceId": "6af5692f1303905617b70d85",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794468143340"
                }
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "remainingQuantity": {
                "$numberInt": "1000"
              },
              "unitCost": {
                "$numberInt": "200"
              },
              "_id": {
                "$oid": "6af5692f1303905617b70d88"
              }
            },
            {
              "sourceType": "PURCHASE",
              "sourceId": "6aeb673031b031ff6bfab9c1",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794468149419"
                }
              },
              "quantity": {
                "$numberInt": "20"
              },
              "remainingQuantity": {
                "$numberInt": "20"
              },
              "unitCost": {
                "$numberInt": "40000"
              },
              "_id": {
                "$oid": "6af569351303905617b70d90"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab969"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Orange",
          "unit": "piece",
          "currentStock": {
            "$numberInt": "97"
          },
          "minStockLevel": {
            "$numberInt": "20"
          },
          "lotsVersion": {
            "$numberInt": "2"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "OPENING",
              "receivedAt": {
                "$date": {
                  "$numberLong": "0"
                }
              },
              "quantity": {
                "$numberInt": "100"
              },
              "remainingQuantity": {
                "$numberInt": "97"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c460"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96a"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Lemon",
          "unit": "piece",
          "currentStock": {
            "$numberInt": "80"
          },
          "minStockLevel": {
            "$numberInt": "15"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "inventorytransactions",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c3"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "IN_PURCHASE",
          "quantity": {
            "$numberInt": "5000"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "5000"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab9bc"
          },
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1790848800000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c4"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "transactionType": "IN_PURCHASE",
          "quantity": {
            "$numberInt": "10000"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "10000"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab9be"
          },
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1790935200000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c5"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "36"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-36"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1791018600000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c6"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "360"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-360"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1791022200000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c7"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab967"
          },
          "transactionType": "SPOILAGE",
          "quantity": {
            "$numberInt": "100"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-100"
          },
          "referenceType": "ADJUSTMENT",
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1791025200000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c8"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "50"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "50"
          },
          "referenceType": "ADJUSTMENT",
          "costTotal": null,
          "createdAt": {
            "$date": {
              "$numberLong": "1791027000000"
            }
          },
          "lotAllocations": [],
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272935"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2649965dbc8f45a5c463"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "36"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-36"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "36"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c468"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057801138"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057801138"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2649965dbc8f45a5c464"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "30"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-30"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c45a"
              },
              "quantity": {
                "$numberInt": "30"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c46a"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057801139"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057801139"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2649965dbc8f45a5c465"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "10"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-10"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c45d"
              },
              "quantity": {
                "$numberInt": "10"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c46c"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057801140"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057801140"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2649965dbc8f45a5c466"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab969"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "1"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-1"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c460"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c46e"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057801140"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057801140"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef26ac965dbc8f45a5c47d"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "18"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-18"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "18"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef26ac965dbc8f45a5c47f"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057900086"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057900086"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef26b6965dbc8f45a5c482"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "36"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-36"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab992"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "36"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef26b6965dbc8f45a5c484"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794057910290"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794057910290"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef27ad965dbc8f45a5c48a"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "36"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-36"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "36"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef27ad965dbc8f45a5c48d"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794058157819"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058157819"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef27ad965dbc8f45a5c48b"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "360"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-360"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef27ad965dbc8f45a5c487"
              },
              "quantity": {
                "$numberInt": "360"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef27ad965dbc8f45a5c48f"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794058157819"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058157819"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef281c965dbc8f45a5c492"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "18"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-18"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aeb7883095eff7be2c8c896"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "18"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef281c965dbc8f45a5c494"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794058268833"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058268833"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2b33a1886f9b5766d239"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "18"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-18"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aef2b21a1886f9b5766d21e"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "18"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2b33a1886f9b5766d23c"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794059059976"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059059976"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2b33a1886f9b5766d23a"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "100"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-100"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6aef2b21a1886f9b5766d21e"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef27ad965dbc8f45a5c487"
              },
              "quantity": {
                "$numberInt": "100"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6aef2b33a1886f9b5766d23e"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794059059977"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059059977"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4c29b6c62c988a55af468"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "18"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-18"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af4c0616c62c988a55af3bb"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c457"
              },
              "quantity": {
                "$numberInt": "18"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af4c29b6c62c988a55af46a"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794425499711"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425499711"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af5683a1303905617b70be5"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "60"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-60"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af568011303905617b70bc7"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c45a"
              },
              "quantity": {
                "$numberInt": "60"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af5683a1303905617b70be9"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794467898399"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467898399"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af5683a1303905617b70be6"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "20"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-20"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af568011303905617b70bc7"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c45d"
              },
              "quantity": {
                "$numberInt": "20"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af5683a1303905617b70beb"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794467898399"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467898399"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af5683a1303905617b70be7"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab969"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "2"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-2"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af568011303905617b70bc7"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c460"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af5683a1303905617b70bed"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794467898400"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467898400"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af569011303905617b70d2a"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "transactionType": "SPOILAGE",
          "quantity": {
            "$numberInt": "1000"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-1000"
          },
          "referenceType": "ADJUSTMENT",
          "note": "Hao hụt / hủy hàng",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": null,
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6aef2649965dbc8f45a5c45d"
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af569011303905617b70d2b"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1794468097235"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468097235"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af5692f1303905617b70d8d"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "transactionType": "IN_PURCHASE",
          "quantity": {
            "$numberInt": "1000"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "1000"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": {
            "$oid": "6af5692f1303905617b70d85"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "200000"
          },
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6af5692f1303905617b70d88"
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "unitCost": {
                "$numberInt": "200"
              },
              "_id": {
                "$oid": "6af5692f1303905617b70d8f"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794468143359"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468143359"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af569351303905617b70d97"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "transactionType": "IN_PURCHASE",
          "quantity": {
            "$numberInt": "20"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "20"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": {
            "$oid": "6aeb673031b031ff6bfab9c1"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "800000"
          },
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6af569351303905617b70d90"
              },
              "quantity": {
                "$numberInt": "20"
              },
              "unitCost": {
                "$numberInt": "40000"
              },
              "_id": {
                "$oid": "6af569351303905617b70d99"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794468149431"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468149431"
            }
          }
        }
      ]
    },
    {
      "name": "loyaltytransactions",
      "indexes": [
        {
          "key": {
            "order": {
              "$numberInt": "1"
            }
          },
          "name": "order_1",
          "unique": true,
          "partialFilterExpression": {
            "automatic": true
          }
        },
        {
          "key": {
            "order": {
              "$numberInt": "1"
            }
          },
          "name": "order_redemption_refund",
          "unique": true,
          "partialFilterExpression": {
            "redemptionRefund": true
          }
        },
        {
          "key": {
            "order": {
              "$numberInt": "1"
            }
          },
          "name": "order_earning_reversal",
          "unique": true,
          "partialFilterExpression": {
            "earningReversal": true
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b1"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "pointsChange": {
            "$numberInt": "80"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b2"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "pointsChange": {
            "$numberInt": "100"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b3"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "pointsChange": {
            "$numberInt": "-20"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b4"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab995"
          },
          "pointsChange": {
            "$numberInt": "80"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272908"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb7764095eff7be2c8c751"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb7764095eff7be2c8c74e"
          },
          "pointsChange": {
            "$numberInt": "-100"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816420246"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816420246"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb7889095eff7be2c8c8a7"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb7883095eff7be2c8c896"
          },
          "pointsChange": {
            "$numberInt": "45"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816713738"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816713742"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "65"
          }
        },
        {
          "_id": {
            "$oid": "6aeb7895095eff7be2c8c8d2"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb7764095eff7be2c8c74e"
          },
          "pointsChange": {
            "$numberInt": "100"
          },
          "automatic": false,
          "redemptionRefund": true,
          "earningReversal": false,
          "transactionType": "REFUND",
          "reason": "Hoàn điểm đổi ưu đãi do hủy đơn",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816725246"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816725250"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "165"
          }
        },
        {
          "_id": {
            "$oid": "6aef28b9965dbc8f45a5c4b3"
          },
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "order": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "pointsChange": {
            "$numberInt": "45"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058425892"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058425914"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "45"
          }
        },
        {
          "_id": {
            "$oid": "6aef28be965dbc8f45a5c4b4"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab994"
          },
          "pointsChange": {
            "$numberInt": "145"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058430034"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058430071"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "195"
          }
        },
        {
          "_id": {
            "$oid": "6aef2aeda1886f9b5766d206"
          },
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "order": {
            "$oid": "6aef2aeda1886f9b5766d203"
          },
          "pointsChange": {
            "$numberInt": "-40"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058989741"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058989741"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aef2b11a1886f9b5766d216"
          },
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "order": {
            "$oid": "6aef2aeda1886f9b5766d203"
          },
          "pointsChange": {
            "$numberInt": "40"
          },
          "automatic": false,
          "redemptionRefund": true,
          "earningReversal": false,
          "transactionType": "REFUND",
          "reason": "Hoàn điểm đổi ưu đãi do hủy đơn",
          "createdAt": {
            "$date": {
              "$numberLong": "1794059025499"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059025505"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "45"
          }
        },
        {
          "_id": {
            "$oid": "6af4c2bd6c62c988a55af475"
          },
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "order": {
            "$oid": "6af4c0616c62c988a55af3bb"
          },
          "pointsChange": {
            "$numberInt": "53"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794425533625"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425533636"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "53"
          }
        },
        {
          "_id": {
            "$oid": "6af568011303905617b70bca"
          },
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "order": {
            "$oid": "6af568011303905617b70bc7"
          },
          "pointsChange": {
            "$numberInt": "-10"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467841908"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467841908"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af5685d1303905617b70bf8"
          },
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "order": {
            "$oid": "6af568011303905617b70bc7"
          },
          "pointsChange": {
            "$numberInt": "88"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467933554"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467933564"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "131"
          }
        }
      ]
    },
    {
      "name": "membershiptiers",
      "indexes": [
        {
          "key": {
            "tierCode": {
              "$numberInt": "1"
            }
          },
          "name": "tierCode_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6acfd385f8768dec47d7de30"
          },
          "tierCode": "BRONZE",
          "tierName": "Đồng",
          "minPoints": {
            "$numberInt": "0"
          },
          "minSpent": {
            "$numberInt": "0"
          },
          "discountPercent": {
            "$numberInt": "0"
          },
          "pointMultiplier": {
            "$numberInt": "1"
          },
          "description": "Hạng khởi đầu mặc định khi đăng ký hội viên.",
          "color": "#b45309",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1792004997247"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1792004997247"
            }
          }
        },
        {
          "_id": {
            "$oid": "6acfd385f8768dec47d7de31"
          },
          "tierCode": "SILVER",
          "tierName": "Bạc",
          "minPoints": {
            "$numberInt": "50"
          },
          "minSpent": {
            "$numberInt": "500000"
          },
          "discountPercent": {
            "$numberInt": "5"
          },
          "pointMultiplier": {
            "$numberDouble": "1.1"
          },
          "description": "Ngưỡng 50 điểm hoặc 500k chi tiêu. Giảm giá 5% và nhân 1.1 điểm.",
          "color": "#64748b",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          }
        },
        {
          "_id": {
            "$oid": "6acfd385f8768dec47d7de32"
          },
          "tierCode": "GOLD",
          "tierName": "Vàng",
          "minPoints": {
            "$numberInt": "150"
          },
          "minSpent": {
            "$numberInt": "1500000"
          },
          "discountPercent": {
            "$numberInt": "10"
          },
          "pointMultiplier": {
            "$numberDouble": "1.25"
          },
          "description": "Ngưỡng 150 điểm hoặc 1.5tr chi tiêu. Giảm giá 10% và nhân 1.25 điểm.",
          "color": "#eab308",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          }
        },
        {
          "_id": {
            "$oid": "6acfd385f8768dec47d7de33"
          },
          "tierCode": "DIAMOND",
          "tierName": "Kim Cương",
          "minPoints": {
            "$numberInt": "300"
          },
          "minSpent": {
            "$numberInt": "3000000"
          },
          "discountPercent": {
            "$numberInt": "15"
          },
          "pointMultiplier": {
            "$numberDouble": "1.5"
          },
          "description": "Ngưỡng 300 điểm hoặc 3tr chi tiêu. Giảm giá 15% và nhân 1.5 điểm.",
          "color": "#06b6d4",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1792004997248"
            }
          }
        }
      ]
    },
    {
      "name": "orderitems",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab997"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "90000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272873"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272873"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab998"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "45000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272876"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272876"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab999"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95f"
          },
          "productNameAtTime": "B├ính Cheesecake Viß╗çt Quß║Ñt",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272880"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272880"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99a"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "productNameAtTime": "Caramel Macchiato ─Éß║╖c Sß║ún",
          "unitPrice": {
            "$numberInt": "65000"
          },
          "customization": {
            "size": "L"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "130000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272882"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058307433"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99b"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab990"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "productNameAtTime": "B├ính Croissant B╞í Ph├íp",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "Ti├¬u chuß║⌐n"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "70000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272884"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058320945"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99c"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M",
            "sugar": "50%"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "90000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272885"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058300348"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99d"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "customization": {
            "size": "L",
            "ice": "├ìt ─æ├í"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272887"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058298992"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99e"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab992"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "customization": {
            "size": "L",
            "ice": "├ìt ─æ├í"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272888"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058311113"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab99f"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab992"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95c"
          },
          "productNameAtTime": "Americano ─É├í Rang ─Éß║¡m",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "35000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272890"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058311879"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a0"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab993"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "90000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272892"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272892"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a1"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab993"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "productNameAtTime": "B├ính Croissant B╞í Ph├íp",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "Ti├¬u chuß║⌐n"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "35000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272894"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272894"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a2"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab994"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "90000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272896"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272896"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a3"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab994"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95f"
          },
          "productNameAtTime": "B├ính Cheesecake Viß╗çt Quß║Ñt",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272898"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272898"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a4"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab995"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95d"
          },
          "productNameAtTime": "Latte Nghß╗ç Thuß║¡t Hß║ít Phß╗ë",
          "unitPrice": {
            "$numberInt": "52000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "52000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272899"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272899"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a5"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab995"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95c"
          },
          "productNameAtTime": "Americano ─É├í Rang ─Éß║¡m",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "35000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272901"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272901"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a6"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab996"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95a"
          },
          "productNameAtTime": "Matcha Latte Uji Kyoto ─É├í Xay",
          "unitPrice": {
            "$numberInt": "58000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "58000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272902"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272902"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb7764095eff7be2c8c74f"
          },
          "order": {
            "$oid": "6aeb7764095eff7be2c8c74e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "53000"
          },
          "customization": {
            "size": "M",
            "sugar": "50%",
            "ice": "Đá chuẩn",
            "topping": [
              "Extra kem muß╗æi"
            ]
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "53000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1793816420241"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816420241"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb7883095eff7be2c8c897"
          },
          "order": {
            "$oid": "6aeb7883095eff7be2c8c896"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "45000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1793816707995"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059062529"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aef2581965dbc8f45a5c455"
          },
          "order": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "45000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794057601658"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058328228"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aef2aeda1886f9b5766d204"
          },
          "order": {
            "$oid": "6aef2aeda1886f9b5766d203"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "productNameAtTime": "Cold Brew ─É├│ng Chai Aura Reserve",
          "unitPrice": {
            "$numberInt": "68000"
          },
          "customization": {
            "size": "Chai 250ml",
            "sugar": "30%",
            "ice": "Ít đá"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "68000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1794058989728"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058989728"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aef2b21a1886f9b5766d21f"
          },
          "order": {
            "$oid": "6aef2b21a1886f9b5766d21e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab957"
          },
          "productNameAtTime": "C├á Ph├¬ Sß╗»a ─É├í S├ái G├▓n N├óu",
          "unitPrice": {
            "$numberInt": "39000"
          },
          "customization": {
            "size": "M",
            "sugar": "50%",
            "ice": "Đá chuẩn"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "39000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794059041703"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059067211"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af4c0616c62c988a55af3bc"
          },
          "order": {
            "$oid": "6af4c0616c62c988a55af3bb"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "unitPrice": {
            "$numberInt": "53000"
          },
          "customization": {
            "size": "M",
            "topping": [
              "Extra kem muß╗æi"
            ]
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "53000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794424929932"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425501950"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af568011303905617b70bc8"
          },
          "order": {
            "$oid": "6af568011303905617b70bc7"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
          "unitPrice": {
            "$numberInt": "45000"
          },
          "customization": {
            "size": "M"
          },
          "quantity": {
            "$numberInt": "2"
          },
          "subtotal": {
            "$numberInt": "90000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794467841900"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467900264"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af56b1a1303905617b70f32"
          },
          "order": {
            "$oid": "6af56b1a1303905617b70f31"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "productNameAtTime": "Cold Brew ─É├│ng Chai Aura Reserve",
          "unitPrice": {
            "$numberInt": "68000"
          },
          "customization": {
            "size": "Chai 250ml",
            "sugar": "30%",
            "ice": "Ít đá"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "68000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1794468634287"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468634287"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "orders",
      "indexes": [
        {
          "key": {
            "orderCode": {
              "$numberInt": "1"
            }
          },
          "name": "orderCode_1",
          "unique": true
        },
        {
          "key": {
            "customer": {
              "$numberInt": "1"
            },
            "idempotencyKey": {
              "$numberInt": "1"
            }
          },
          "name": "customer_1_idempotencyKey_1",
          "unique": true,
          "partialFilterExpression": {
            "idempotencyKey": {
              "$type": "string"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "orderCode": "AURA-001",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "90000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "90000"
          },
          "discountAmount": {
            "$numberInt": "9000"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "81000"
          },
          "paymentMethod": "CASH",
          "tableNumber": "T01",
          "orderNote": "Less ice",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791018000000"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272864"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "orderCode": "AURA-002",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab958"
              },
              "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "45000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95f"
              },
              "productNameAtTime": "B├ính Cheesecake Viß╗çt Quß║Ñt",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "100000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "15000"
          },
          "finalAmount": {
            "$numberInt": "115000"
          },
          "paymentMethod": "CASH",
          "recipientName": "Pham Quang Huy",
          "recipientPhone": "0900000005",
          "deliveryAddress": "Cau Giay, Hanoi",
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "orderNote": "Call before delivery",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791021600000"
            }
          },
          "__v": {
            "$numberInt": "1"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058410362"
            }
          },
          "checkoutFlow": false
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "orderCode": "AURA-003",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "TAKEAWAY",
          "status": "READY",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab955"
              },
              "productNameAtTime": "Caramel Macchiato ─Éß║╖c Sß║ún",
              "unitPrice": {
                "$numberInt": "65000"
              },
              "customization": {
                "size": "L"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "130000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "36"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab964"
                  },
                  "ingredientName": "Fresh milk",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6aef27ad965dbc8f45a5c487"
                  },
                  "quantity": {
                    "$numberInt": "360"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "130000"
          },
          "discountAmount": {
            "$numberInt": "20000"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "110000"
          },
          "paymentMethod": "CASH",
          "orderNote": "No sugar",
          "inventoryProcessing": true,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1791025200000"
            }
          },
          "__v": {
            "$numberInt": "4"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058308494"
            }
          },
          "checkoutFlow": false,
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794058157822"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794058157822"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab990"
          },
          "orderCode": "AURA-004",
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "READY",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab959"
              },
              "productNameAtTime": "B├ính Croissant B╞í Ph├íp",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "Ti├¬u chuß║⌐n"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "70000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "70000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "70000"
          },
          "paymentMethod": "CASH",
          "tableNumber": "T02",
          "inventoryProcessing": true,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1791028800000"
            }
          },
          "__v": {
            "$numberInt": "3"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058321810"
            }
          },
          "checkoutFlow": false,
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794058320936"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794058320936"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "orderCode": "AURA-005",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "READY",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M",
                "sugar": "50%"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "90000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "36"
                  },
                  "unitCost": null
                }
              ]
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab958"
              },
              "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "customization": {
                "size": "L",
                "ice": "├ìt ─æ├í"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab965"
                  },
                  "ingredientName": "Peach syrup",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c45a"
                  },
                  "quantity": {
                    "$numberInt": "30"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab966"
                  },
                  "ingredientName": "Black tea",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c45d"
                  },
                  "quantity": {
                    "$numberInt": "10"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab969"
                  },
                  "ingredientName": "Orange",
                  "unit": "piece",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c460"
                  },
                  "quantity": {
                    "$numberInt": "1"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "145000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "145000"
          },
          "paymentMethod": "CASH",
          "tableNumber": "T03",
          "inventoryProcessing": true,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1791029400000"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058302260"
            }
          },
          "checkoutFlow": false,
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794057801151"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794057801151"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab992"
          },
          "orderCode": "AURA-006",
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "TAKEAWAY",
          "status": "READY",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "customization": {
                "size": "L",
                "ice": "├ìt ─æ├í"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                }
              ]
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95c"
              },
              "productNameAtTime": "Americano ─É├í Rang ─Éß║¡m",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "35000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "90000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "90000"
          },
          "paymentMethod": "CASH",
          "orderNote": "Less ice",
          "inventoryProcessing": true,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1791029700000"
            }
          },
          "__v": {
            "$numberInt": "5"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058313226"
            }
          },
          "checkoutFlow": false,
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794057910292"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794057910292"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab993"
          },
          "orderCode": "AURA-007",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "CONFIRMED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "90000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab959"
              },
              "productNameAtTime": "B├ính Croissant B╞í Ph├íp",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "Ti├¬u chuß║⌐n"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "35000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "125000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "143000"
          },
          "paymentMethod": "CASH",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "Hoan Kiem, Hanoi",
          "orderNote": "Call before delivery",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791030000000"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272866"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab994"
          },
          "orderCode": "AURA-008",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab958"
              },
              "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "90000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95f"
              },
              "productNameAtTime": "B├ính Cheesecake Viß╗çt Quß║Ñt",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "145000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "163000"
          },
          "paymentMethod": "CASH",
          "recipientName": "Pham Quang Huy",
          "recipientPhone": "0900000005",
          "deliveryAddress": "Dong Da, Hanoi",
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791027900000"
            }
          },
          "__v": {
            "$numberInt": "2"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058429929"
            }
          },
          "checkoutFlow": false
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab995"
          },
          "orderCode": "AURA-009",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95d"
              },
              "productNameAtTime": "Latte Nghß╗ç Thuß║¡t Hß║ít Phß╗ë",
              "unitPrice": {
                "$numberInt": "52000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "52000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95c"
              },
              "productNameAtTime": "Americano ─É├í Rang ─Éß║¡m",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "35000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "87000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "105000"
          },
          "paymentMethod": "CASH",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "Hoan Kiem, Hanoi",
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791019800000"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272867"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab996"
          },
          "orderCode": "AURA-010",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "TAKEAWAY",
          "status": "CANCELLED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95a"
              },
              "productNameAtTime": "Matcha Latte Uji Kyoto ─É├í Xay",
              "unitPrice": {
                "$numberInt": "58000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "58000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "58000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "58000"
          },
          "paymentMethod": "CASH",
          "cancelReason": "Customer changed mind",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1791023400000"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272867"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb7764095eff7be2c8c74e"
          },
          "orderCode": "AURA-MW2FZC79-745C6686",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsRedeemed": {
            "$numberInt": "100"
          },
          "orderType": "ONLINE",
          "status": "CANCELLED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "53000"
              },
              "customization": {
                "size": "M",
                "sugar": "50%",
                "ice": "Đá chuẩn",
                "topping": [
                  "Extra kem muß╗æi"
                ]
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "53000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "53000"
          },
          "discountAmount": {
            "$numberInt": "20000"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "51000"
          },
          "paymentMethod": "COD",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "Hoàn Kiếm, Hà Nội",
          "orderNote": "Cà Phê Muối Aura Đặc Biệt (M): đường 50%, Đá chuẩn",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816420236"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816725238"
            }
          },
          "__v": {
            "$numberInt": "1"
          },
          "cancelReason": "Lý do khác"
        },
        {
          "_id": {
            "$oid": "6aeb7883095eff7be2c8c896"
          },
          "orderCode": "AURA-MW2G5I8M-41701E86",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "READY",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "45000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "45000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "63000"
          },
          "paymentMethod": "DEMO_ONLINE",
          "demoProvider": "MOMO",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "Hoàn Kiếm, Hà Nội",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816707992"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059063533"
            }
          },
          "__v": {
            "$numberInt": "4"
          },
          "checkoutFlow": false,
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794058268835"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794058268835"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "orderCode": "AURA-MW6FKOZ3-BDE326B5",
          "checkoutFlow": true,
          "checkoutSessionId": "772646de-e919-484d-b883-26ae249d6a76",
          "idempotencyKey": "49e6ea8e-3d6c-411e-a64f-5650d3831128",
          "requestHash": "2059fbbc1eea0abf73bbdf1196d78d1467f612bf75aea24d18b8a3c54b75cb43",
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "45000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "45000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "63000"
          },
          "paymentMethod": "COD",
          "recipientName": "Nguyên",
          "recipientPhone": "0965916512",
          "deliveryAddress": "Hà nội, Hà nội, Hoàn Kiếm, Hà Nội",
          "district": "Hoàn Kiếm",
          "ward": "Hà nội",
          "addressDetail": "Hà nội",
          "inventoryProcessing": true,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794057601650"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058425840"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "cartClearedAt": {
            "$date": {
              "$numberLong": "1794057623517"
            }
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794057900089"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794057900089"
            }
          },
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          }
        },
        {
          "_id": {
            "$oid": "6aef2aeda1886f9b5766d203"
          },
          "orderCode": "AURA-MW6GEG0K-43670BFD",
          "checkoutFlow": false,
          "customer": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "40"
          },
          "orderType": "TAKEAWAY",
          "status": "CANCELLED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab956"
              },
              "productNameAtTime": "Cold Brew ─É├│ng Chai Aura Reserve",
              "unitPrice": {
                "$numberInt": "68000"
              },
              "customization": {
                "size": "Chai 250ml",
                "sugar": "30%",
                "ice": "Ít đá"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "68000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "68000"
          },
          "discountAmount": {
            "$numberInt": "8000"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "60000"
          },
          "paymentMethod": "PAY_AT_COUNTER",
          "orderNote": "1 x Cold Brew Đóng Chai Aura Reserve (Chai 250ml): đường 30%, Ít đá",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058989722"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059025481"
            }
          },
          "__v": {
            "$numberInt": "1"
          },
          "cancelReason": "adas"
        },
        {
          "_id": {
            "$oid": "6aef2b21a1886f9b5766d21e"
          },
          "orderCode": "AURA-MW6GFK4H-8F4445CB",
          "checkoutFlow": false,
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab957"
              },
              "productNameAtTime": "C├á Ph├¬ Sß╗»a ─É├í S├ái G├▓n N├óu",
              "unitPrice": {
                "$numberInt": "39000"
              },
              "customization": {
                "size": "M",
                "sugar": "50%",
                "ice": "Đá chuẩn"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "39000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab964"
                  },
                  "ingredientName": "Fresh milk",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6aef27ad965dbc8f45a5c487"
                  },
                  "quantity": {
                    "$numberInt": "100"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "39000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "39000"
          },
          "paymentMethod": "CASH",
          "tableNumber": "T01",
          "orderNote": "1 x Cà Phê Sữa Đá Sài Gòn Nâu (M): đường 50%, Đá chuẩn",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794059041700"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425686718"
            }
          },
          "__v": {
            "$numberInt": "5"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794059059983"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794059059983"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4c0616c62c988a55af3bb"
          },
          "orderCode": "AURA-MWCI9TA7-8F4ACC29",
          "checkoutFlow": true,
          "checkoutSessionId": "93d7c086-027c-4f8a-a590-6d0453ed28d0",
          "idempotencyKey": "b6537738-13ac-44da-b142-94fb56c36f62",
          "requestHash": "8e74269d3acb7e2838cb145a6f983100d4bf888a4fe62457d0e33bb709f5579d",
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
              "unitPrice": {
                "$numberInt": "53000"
              },
              "customization": {
                "size": "M",
                "topping": [
                  "Extra kem muß╗æi"
                ]
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "53000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab963"
                  },
                  "ingredientName": "Coffee beans",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c457"
                  },
                  "quantity": {
                    "$numberInt": "18"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "53000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "71000"
          },
          "paymentMethod": "COD",
          "recipientName": "Nguyên Nguyễn Quốc",
          "recipientPhone": "0965916511",
          "deliveryAddress": "đâsdasd, cádada, Ba Đình, Hà Nội",
          "district": "Ba Đình",
          "ward": "cádada",
          "addressDetail": "đâsdasd",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794424929922"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425533609"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "cartClearedAt": {
            "$date": {
              "$numberLong": "1794424937499"
            }
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794425499719"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794425499719"
            }
          },
          "shipper": {
            "$oid": "6af4b8350b44b941144fb48f"
          }
        },
        {
          "_id": {
            "$oid": "6af568011303905617b70bc7"
          },
          "orderCode": "AURA-MWD7TKD3-3EE71C7F",
          "checkoutFlow": true,
          "checkoutSessionId": "ed6578e1-c2e8-4fe8-aeed-dcbba08127e5",
          "idempotencyKey": "8fd0af47-ada3-43a3-8189-f5a60ba607d2",
          "requestHash": "58b826ae7bfef3a899594b4c0278af79630ab27e20a45f41a07ddbe650093574",
          "customer": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "pointsRedeemed": {
            "$numberInt": "10"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab958"
              },
              "productNameAtTime": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
              "unitPrice": {
                "$numberInt": "45000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "2"
              },
              "subtotal": {
                "$numberInt": "90000"
              },
              "isPrepared": true,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab965"
                  },
                  "ingredientName": "Peach syrup",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c45a"
                  },
                  "quantity": {
                    "$numberInt": "60"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab966"
                  },
                  "ingredientName": "Black tea",
                  "unit": "gram",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c45d"
                  },
                  "quantity": {
                    "$numberInt": "20"
                  },
                  "unitCost": null
                },
                {
                  "ingredient": {
                    "$oid": "6aeb673031b031ff6bfab969"
                  },
                  "ingredientName": "Orange",
                  "unit": "piece",
                  "lotId": {
                    "$oid": "6aef2649965dbc8f45a5c460"
                  },
                  "quantity": {
                    "$numberInt": "2"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "90000"
          },
          "discountAmount": {
            "$numberInt": "2000"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "106000"
          },
          "paymentMethod": "COD",
          "recipientName": "Nguyên Nguyễn Quốc",
          "recipientPhone": "0965916511",
          "deliveryAddress": "đasadas, đâsdasd, Ba Đình, Hà Nội",
          "district": "Ba Đình",
          "ward": "đâsdasd",
          "addressDetail": "đasadas",
          "orderNote": "đâsdas",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467841889"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467933500"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "cartClearedAt": {
            "$date": {
              "$numberLong": "1794467858148"
            }
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794467898412"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794467898414"
            }
          },
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          }
        },
        {
          "_id": {
            "$oid": "6af56b1a1303905617b70f31"
          },
          "orderCode": "AURA-MWD8AJRA-ACFF6264",
          "checkoutFlow": false,
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "CONFIRMED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab956"
              },
              "productNameAtTime": "Cold Brew ─É├│ng Chai Aura Reserve",
              "unitPrice": {
                "$numberInt": "68000"
              },
              "customization": {
                "size": "Chai 250ml",
                "sugar": "30%",
                "ice": "Ít đá"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "68000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "68000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "68000"
          },
          "paymentMethod": "CASH",
          "tableNumber": "T01",
          "orderNote": "1 x Cold Brew Đóng Chai Aura Reserve (Chai 250ml): đường 30%, Ít đá",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1794468634278"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468637654"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "payments",
      "indexes": [
        {
          "key": {
            "status": {
              "$numberInt": "1"
            },
            "paymentMethod": {
              "$numberInt": "1"
            },
            "paidAt": {
              "$numberInt": "1"
            }
          },
          "name": "status_1_paymentMethod_1_paidAt_1"
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a7"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "81000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791018300000"
            }
          },
          "paymentNote": "Paid at counter",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a8"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "paymentMethod": "MOMO",
          "transactionCode": "MOMO-DEMO-002",
          "amount": {
            "$numberInt": "115000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791021900000"
            }
          },
          "paymentNote": "Online payment",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9a9"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98f"
          },
          "paymentMethod": "VNPAY",
          "transactionCode": "VNPAY-DEMO-003",
          "amount": {
            "$numberInt": "110000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791025500000"
            }
          },
          "paymentNote": "Paid by VNPAY",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9aa"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab990"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "70000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791029100000"
            }
          },
          "paymentNote": "Paid at counter",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ab"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab991"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "145000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791029460000"
            }
          },
          "paymentNote": "Paid at counter",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ac"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab992"
          },
          "paymentMethod": "MOMO",
          "transactionCode": "MOMO-DEMO-006",
          "amount": {
            "$numberInt": "90000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791029760000"
            }
          },
          "paymentNote": "Online payment",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ad"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab993"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "143000"
          },
          "status": "PENDING",
          "paymentNote": "COD - collect on delivery",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ae"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab994"
          },
          "paymentMethod": "VNPAY",
          "transactionCode": "VNPAY-DEMO-008",
          "amount": {
            "$numberInt": "163000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791027960000"
            }
          },
          "paymentNote": "Paid by VNPAY",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9af"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab995"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "105000"
          },
          "status": "SUCCESS",
          "paidAt": {
            "$date": {
              "$numberLong": "1791021300000"
            }
          },
          "paymentNote": "COD collected by shipper",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b0"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab996"
          },
          "paymentMethod": "MOMO",
          "transactionCode": "MOMO-DEMO-010",
          "amount": {
            "$numberInt": "58000"
          },
          "status": "FAILED",
          "paymentNote": "Order cancelled before payment",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272905"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb7764095eff7be2c8c750"
          },
          "order": {
            "$oid": "6aeb7764095eff7be2c8c74e"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "51000"
          },
          "status": "FAILED",
          "paymentNote": "Đơn đặt online",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816420244"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816725253"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb7883095eff7be2c8c898"
          },
          "order": {
            "$oid": "6aeb7883095eff7be2c8c896"
          },
          "paymentMethod": "DEMO_ONLINE",
          "demoProvider": "MOMO",
          "amount": {
            "$numberInt": "63000"
          },
          "status": "SUCCESS",
          "paymentNote": "Đã xác nhận trên cổng thanh toán mô phỏng; không thu tiền thật",
          "createdAt": {
            "$date": {
              "$numberLong": "1793816707997"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816713724"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1793816713724"
            }
          },
          "transactionCode": "DEMO-C4423359C0E9"
        },
        {
          "_id": {
            "$oid": "6aef2581965dbc8f45a5c456"
          },
          "order": {
            "$oid": "6aef2581965dbc8f45a5c454"
          },
          "paymentMethod": "CASH",
          "transactionCode": "COD-AURA-MW6FKOZ3-BDE326B5",
          "amount": {
            "$numberInt": "63000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu tiền COD khi giao hàng hoàn tất",
          "createdAt": {
            "$date": {
              "$numberLong": "1794057601664"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058425848"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794058425847"
            }
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab948"
          }
        },
        {
          "_id": {
            "$oid": "6aef2aeda1886f9b5766d205"
          },
          "order": {
            "$oid": "6aef2aeda1886f9b5766d203"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "60000"
          },
          "status": "FAILED",
          "paymentNote": "Thanh toán tại quầy",
          "createdAt": {
            "$date": {
              "$numberLong": "1794058989735"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059025509"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aef2b21a1886f9b5766d220"
          },
          "order": {
            "$oid": "6aef2b21a1886f9b5766d21e"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "39000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu ngân Tran Thi Binh xác nhận đã nhận tiền tại quầy và tự đối soát giao dịch",
          "createdAt": {
            "$date": {
              "$numberLong": "1794059041705"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059043128"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794059043128"
            }
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          }
        },
        {
          "_id": {
            "$oid": "6af4c0616c62c988a55af3bd"
          },
          "order": {
            "$oid": "6af4c0616c62c988a55af3bb"
          },
          "paymentMethod": "CASH",
          "transactionCode": "COD-AURA-MWCI9TA7-8F4ACC29",
          "amount": {
            "$numberInt": "71000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu tiền COD khi giao hàng hoàn tất",
          "createdAt": {
            "$date": {
              "$numberLong": "1794424929939"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425572660"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794425533612"
            }
          },
          "receivedBy": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "remittanceId": "9e370fe8-1d7f-403a-a39c-16eb489707e5",
          "remittanceSchedule": {
            "$oid": "6af4bfd56c62c988a55af322"
          },
          "remittedAt": {
            "$date": {
              "$numberLong": "1794425572653"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af568011303905617b70bc9"
          },
          "order": {
            "$oid": "6af568011303905617b70bc7"
          },
          "paymentMethod": "CASH",
          "transactionCode": "COD-AURA-MWD7TKD3-3EE71C7F",
          "amount": {
            "$numberInt": "106000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu tiền COD khi giao hàng hoàn tất",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467841904"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467933507"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794467933505"
            }
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab948"
          }
        },
        {
          "_id": {
            "$oid": "6af56b1a1303905617b70f33"
          },
          "order": {
            "$oid": "6af56b1a1303905617b70f31"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "68000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu ngân Tran Thi Binh xác nhận đã nhận tiền mặt tại quầy",
          "createdAt": {
            "$date": {
              "$numberLong": "1794468634294"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468637642"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "changeAmount": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794468637641"
            }
          },
          "receivedAmount": {
            "$numberInt": "68000"
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          }
        }
      ]
    },
    {
      "name": "productingredients",
      "indexes": [
        {
          "key": {
            "product": {
              "$numberInt": "1"
            },
            "ingredient": {
              "$numberInt": "1"
            }
          },
          "name": "product_1_ingredient_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96b"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "18"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96c"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "18"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96d"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantityRequired": {
            "$numberInt": "180"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "30"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab96f"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab957"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "18"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab970"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab957"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantityRequired": {
            "$numberInt": "100"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab971"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "quantityRequired": {
            "$numberInt": "30"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab972"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "quantityRequired": {
            "$numberInt": "10"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab973"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab969"
          },
          "quantityRequired": {
            "$numberInt": "1"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab974"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95b"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "quantityRequired": {
            "$numberInt": "10"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab975"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95c"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "18"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab976"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95d"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantityRequired": {
            "$numberInt": "18"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab977"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95d"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantityRequired": {
            "$numberInt": "150"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab978"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95f"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "quantityRequired": {
            "$numberInt": "1"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272808"
            }
          }
        }
      ]
    },
    {
      "name": "products",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94f"
          },
          "name": "C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt",
          "basePrice": {
            "$numberInt": "45000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "Phin Cß╗ò ─Éiß╗ân",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Extra kem muß╗æi",
                "price": {
                  "$numberInt": "8000"
                }
              },
              {
                "name": "Extra shot espresso",
                "price": {
                  "$numberInt": "10000"
                }
              }
            ]
          },
          "description": "Fine Robusta ß╗º phin truyß╗ün thß╗æng phß╗æi kem sß╗»a mß║▒n mß║╖n b├⌐o ngß║¡y, c├ón bß║▒ng hß║¡u vß╗ï ngß╗ìt ─æß║ºm.",
          "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "18"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab979"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272792"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272811"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94e"
          },
          "name": "Caramel Macchiato ─Éß║╖c Sß║ún",
          "basePrice": {
            "$numberInt": "55000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "Espresso Base",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Sß╗æt caramel th├¬m",
                "price": {
                  "$numberInt": "5000"
                }
              },
              {
                "name": "Kem whipping",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Lß╗¢p sß╗»a t╞░╞íi n├│ng thanh dß╗ïu, quyß╗çn c├╣ng espresso k├⌐p Arabica Cß║ºu ─Éß║Ñt ─æß║¡m ─æ├á v├á v├ón sß╗æt caramel th╞ím lß╗½ng.",
          "imageUrl": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "18"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab97a"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab964"
              },
              "quantityRequired": {
                "$numberInt": "180"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab97b"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272824"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab953"
          },
          "name": "Cold Brew ─É├│ng Chai Aura Reserve",
          "basePrice": {
            "$numberInt": "68000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "ß╗ª Lß║ính 16 Tiß║┐ng",
          "variantsConfig": {
            "sizes": {
              "Chai 250ml": {
                "$numberInt": "0"
              },
              "Chai 500ml": {
                "$numberInt": "35000"
              }
            },
            "toppings": []
          },
          "description": "Chiß║┐t xuß║Ñt lß║ính 16 tiß║┐ng tß╗½ 100% Arabica Bourbon, h╞░╞íng hoa quß║ú nhiß╗çt ─æß╗¢i t╞░╞íi m├ít, giß╗» trß╗ìn vß╗ï nguy├¬n bß║ún.",
          "imageUrl": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "30"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab97d"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272827"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab957"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94f"
          },
          "name": "C├á Ph├¬ Sß╗»a ─É├í S├ái G├▓n N├óu",
          "basePrice": {
            "$numberInt": "39000"
          },
          "subtitle": "─Éß║¡m Vß╗ï Phin",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "8000"
              }
            },
            "toppings": [
              {
                "name": "Thß║ích c├á ph├¬",
                "price": {
                  "$numberInt": "6000"
                }
              },
              {
                "name": "Extra shot phin",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Hß║ít Fine Robusta rang n├óu b├│ng m╞░ß╗út, chiß║┐t xuß║Ñt phin chß║¡m kß║┐t hß╗úp sß╗»a ─æß║╖c ngß╗ìt ├¬m b├⌐o ngß║¡y truyß╗ün thß╗æng.",
          "imageUrl": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "18"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab97e"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab964"
              },
              "quantityRequired": {
                "$numberInt": "100"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab97f"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272831"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab958"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab950"
          },
          "name": "Tr├á ─É├áo Cam Sß║ú T╞░╞íi",
          "basePrice": {
            "$numberInt": "45000"
          },
          "badge": "M├ôN Mß╗ÜI",
          "subtitle": "Fresh Brew",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Thß║ích ─æ├áo gi├▓n",
                "price": {
                  "$numberInt": "8000"
                }
              },
              {
                "name": "Hß║ít chia",
                "price": {
                  "$numberInt": "5000"
                }
              }
            ]
          },
          "description": "N╞░ß╗¢c cß╗æt tr├á ─æen Ceylon thanh dß╗ïu kß║┐t hß╗úp miß║┐ng ─æ├áo gi├▓n ngß╗ìt mß╗ìng n╞░ß╗¢c c├╣ng sß║ú t╞░╞íi ß║Ñm nß╗ông.",
          "imageUrl": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab965"
              },
              "quantityRequired": {
                "$numberInt": "30"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab981"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab966"
              },
              "quantityRequired": {
                "$numberInt": "10"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab982"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab969"
              },
              "quantityRequired": {
                "$numberInt": "1"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab984"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272839"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab952"
          },
          "name": "B├ính Croissant B╞í Ph├íp",
          "basePrice": {
            "$numberInt": "35000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "B╞í Elle & Vire",
          "variantsConfig": {
            "sizes": {
              "Ti├¬u chuß║⌐n": {
                "$numberInt": "0"
              }
            },
            "toppings": [
              {
                "name": "Mß╗⌐t d├óu t├óy",
                "price": {
                  "$numberInt": "6000"
                }
              },
              {
                "name": "Sß╗æt s├┤c├┤la",
                "price": {
                  "$numberInt": "6000"
                }
              }
            ]
          },
          "description": "Bß╗Öt ng├án lß╗¢p thß╗º c├┤ng gi├▓n rß╗Ñm b├¬n ngo├ái, mß╗üm xß╗æp ngß║¡y h╞░╞íng b╞í Elle & Vire hß║úo hß║íng b├¬n trong.",
          "imageUrl": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95a"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab951"
          },
          "name": "Matcha Latte Uji Kyoto ─É├í Xay",
          "basePrice": {
            "$numberInt": "58000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "Uji Kyoto Grade",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "12000"
              }
            },
            "toppings": [
              {
                "name": "Kem whipping",
                "price": {
                  "$numberInt": "8000"
                }
              },
              {
                "name": "Thß║ích matcha",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Bß╗Öt tr├á xanh Uji trß╗⌐ danh cß╗æ ─æ├┤ Kyoto xay c├╣ng sß╗»a hß║ít v├á kem whipping b├┤ng xß╗æp b├⌐o mß╗ïn th╞░ß╗úng hß║íng.",
          "imageUrl": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95b"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab950"
          },
          "name": "Tr├á Sen V├áng Long Nh├ún",
          "basePrice": {
            "$numberInt": "49000"
          },
          "subtitle": "Tr├á ─Éen Ceylon",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Hß║ít sen th├¬m",
                "price": {
                  "$numberInt": "10000"
                }
              },
              {
                "name": "Cß╗º n─âng gi├▓n",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Hß║ít sen Huß║┐ ninh mß╗üm dß║╗o, nh├ún nhß╗Ñc ngß╗ìt thanh quyß╗çn c├╣ng tr├á ├┤ long hß║úo hß║íng v├á lß╗¢p kem cß╗º n─âng gi├▓n.",
          "imageUrl": "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab966"
              },
              "quantityRequired": {
                "$numberInt": "10"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab987"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272793"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272843"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95c"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94e"
          },
          "name": "Americano ─É├í Rang ─Éß║¡m",
          "basePrice": {
            "$numberInt": "35000"
          },
          "subtitle": "Espresso Base",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Extra shot espresso",
                "price": {
                  "$numberInt": "10000"
                }
              }
            ]
          },
          "description": "Espresso k├⌐p chiß║┐t xuß║Ñt ├íp suß║Ñt cao tß╗½ hß║ít c├á ph├¬ ─æß║╖c sß║ún, vß╗ï chua thanh thanh tao v├á hß║¡u ngß╗ìt d├ái l├óu.",
          "imageUrl": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "18"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab988"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272794"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272845"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95d"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94e"
          },
          "name": "Latte Nghß╗ç Thuß║¡t Hß║ít Phß╗ë",
          "basePrice": {
            "$numberInt": "52000"
          },
          "badge": "M├ôN Mß╗ÜI",
          "subtitle": "Espresso Base",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Siro hß║ít phß╗ë",
                "price": {
                  "$numberInt": "6000"
                }
              },
              {
                "name": "Sß╗»a yß║┐n mß║ích (Oat milk)",
                "price": {
                  "$numberInt": "12000"
                }
              }
            ]
          },
          "description": "H├▓a quyß╗çn tinh tß║┐ giß╗»a espresso th╞ím ng├ít, sß╗»a t╞░╞íi ─æ├ính bß╗ìt mß╗ïn m├áng v├á siro hß║ít phß╗ë th╞ím lß╗½ng.",
          "imageUrl": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantityRequired": {
                "$numberInt": "18"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab989"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab964"
              },
              "quantityRequired": {
                "$numberInt": "150"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab98a"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272794"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272848"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95e"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab951"
          },
          "name": "S├┤c├┤la Bß╗ë ─É├í Xay Hß║ính Nh├ón",
          "basePrice": {
            "$numberInt": "55000"
          },
          "subtitle": "Chocolate Rich",
          "variantsConfig": {
            "sizes": {
              "M": {
                "$numberInt": "0"
              },
              "L": {
                "$numberInt": "10000"
              }
            },
            "toppings": [
              {
                "name": "Kem whipping",
                "price": {
                  "$numberInt": "8000"
                }
              },
              {
                "name": "Hß║ính nh├ón vß╗Ñn",
                "price": {
                  "$numberInt": "6000"
                }
              }
            ]
          },
          "description": "Bß╗Öt cacao nguy├¬n chß║Ñt nhß║¡p khß║⌐u Bß╗ë xay nhuyß╗àn c├╣ng sß╗»a ─æß║╖c, rß║»c hß║ính nh├ón n╞░ß╗¢ng gi├▓n tan.",
          "imageUrl": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272794"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272794"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab95f"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab952"
          },
          "name": "B├ính Cheesecake Viß╗çt Quß║Ñt",
          "basePrice": {
            "$numberInt": "55000"
          },
          "badge": "B├üN CHß║áY",
          "subtitle": "New York Style",
          "variantsConfig": {
            "sizes": {
              "1 Phß║ºn": {
                "$numberInt": "0"
              }
            },
            "toppings": []
          },
          "description": "Cream cheese Philadelphia b├⌐o ngß║¡y kß║┐t hß╗úp mß╗⌐t viß╗çt quß║Ñt chua ngß╗ìt dß╗ïu v├á ─æß║┐ b├ính quy n╞░ß╗¢ng th╞ím lß╗½ng.",
          "imageUrl": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab968"
              },
              "quantityRequired": {
                "$numberInt": "1"
              },
              "_id": {
                "$oid": "6aeb673031b031ff6bfab98c"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272794"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272850"
            }
          }
        }
      ]
    },
    {
      "name": "purchaseorderitems",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9bd"
          },
          "purchaseOrder": {
            "$oid": "6aeb673031b031ff6bfab9bc"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "quantity": {
            "$numberInt": "5000"
          },
          "unitPrice": {
            "$numberInt": "400"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272922"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272922"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9bf"
          },
          "purchaseOrder": {
            "$oid": "6aeb673031b031ff6bfab9be"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantity": {
            "$numberInt": "10000"
          },
          "unitPrice": {
            "$numberInt": "150"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272926"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272926"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c0"
          },
          "purchaseOrder": {
            "$oid": "6aeb673031b031ff6bfab9be"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab965"
          },
          "quantity": {
            "$numberInt": "5000"
          },
          "unitPrice": {
            "$numberInt": "120"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272928"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272928"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c2"
          },
          "purchaseOrder": {
            "$oid": "6aeb673031b031ff6bfab9c1"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "quantity": {
            "$numberInt": "20"
          },
          "unitPrice": {
            "$numberInt": "40000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272932"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272932"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af5692f1303905617b70d86"
          },
          "purchaseOrder": {
            "$oid": "6af5692f1303905617b70d85"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "quantity": {
            "$numberInt": "1000"
          },
          "unitPrice": {
            "$numberInt": "200"
          },
          "totalCost": {
            "$numberInt": "200000"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794468143295"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468143295"
            }
          }
        }
      ]
    },
    {
      "name": "purchaseorders",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9bc"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "totalCost": {
            "$numberInt": "2000000"
          },
          "status": "RECEIVED",
          "items": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab963"
              },
              "quantity": {
                "$numberInt": "5000"
              },
              "unitPrice": {
                "$numberInt": "400"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1790841600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790841600000"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9be"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "totalCost": {
            "$numberInt": "1500000"
          },
          "status": "ORDERED",
          "items": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab964"
              },
              "quantity": {
                "$numberInt": "10000"
              },
              "unitPrice": {
                "$numberInt": "150"
              }
            },
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab965"
              },
              "quantity": {
                "$numberInt": "5000"
              },
              "unitPrice": {
                "$numberInt": "120"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1790931600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790931600000"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c1"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab962"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "totalCost": {
            "$numberInt": "800000"
          },
          "status": "RECEIVED",
          "items": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab968"
              },
              "quantity": {
                "$numberInt": "20"
              },
              "unitPrice": {
                "$numberInt": "40000"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1791014400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468149399"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af5692f1303905617b70d85"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab962"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "totalCost": {
            "$numberInt": "200000"
          },
          "status": "RECEIVED",
          "note": "",
          "items": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab968"
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "unitPrice": {
                "$numberInt": "200"
              },
              "totalCost": {
                "$numberInt": "200000"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1794468143282"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794468143321"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "restockrequests",
      "indexes": [],
      "documents": []
    },
    {
      "name": "rewarditems",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b5"
          },
          "name": "Giß║úm 15.000─æ bß║▒ng ─æiß╗âm",
          "pointsCost": {
            "$numberInt": "100"
          },
          "discountValue": {
            "$numberInt": "15000"
          },
          "minOrderValue": {
            "$numberInt": "60000"
          },
          "validDays": {
            "$numberInt": "30"
          },
          "imageIcon": "card_giftcard",
          "stock": {
            "$numberInt": "50"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b6"
          },
          "name": "Giß║úm 30.000─æ bß║▒ng ─æiß╗âm",
          "pointsCost": {
            "$numberInt": "180"
          },
          "discountValue": {
            "$numberInt": "30000"
          },
          "minOrderValue": {
            "$numberInt": "120000"
          },
          "validDays": {
            "$numberInt": "30"
          },
          "imageIcon": "card_giftcard",
          "stock": {
            "$numberInt": "30"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b7"
          },
          "name": "Giß║úm 50.000─æ bß║▒ng ─æiß╗âm",
          "pointsCost": {
            "$numberInt": "300"
          },
          "discountValue": {
            "$numberInt": "50000"
          },
          "minOrderValue": {
            "$numberInt": "200000"
          },
          "validDays": {
            "$numberInt": "30"
          },
          "imageIcon": "card_giftcard",
          "stock": {
            "$numberInt": "20"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b8"
          },
          "name": "Giß║úm 100.000─æ bß║▒ng ─æiß╗âm",
          "pointsCost": {
            "$numberInt": "600"
          },
          "discountValue": {
            "$numberInt": "100000"
          },
          "minOrderValue": {
            "$numberInt": "350000"
          },
          "validDays": {
            "$numberInt": "30"
          },
          "imageIcon": "card_giftcard",
          "stock": {
            "$numberInt": "10"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "shifthandovers",
      "indexes": [
        {
          "key": {
            "schedule": {
              "$numberInt": "1"
            }
          },
          "name": "schedule_1",
          "unique": true
        },
        {
          "key": {
            "cashier": {
              "$numberInt": "1"
            },
            "workDate": {
              "$numberInt": "1"
            }
          },
          "name": "cashier_1_workDate_1"
        },
        {
          "key": {
            "status": {
              "$numberInt": "1"
            }
          },
          "name": "status_1"
        }
      ],
      "documents": []
    },
    {
      "name": "shopsettings",
      "indexes": [
        {
          "key": {
            "settingKey": {
              "$numberInt": "1"
            }
          },
          "name": "settingKey_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9c9"
          },
          "settingKey": "freeship_threshold",
          "settingValue": "150000",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ca"
          },
          "settingKey": "delivery_fee",
          "settingValue": "18000",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9cb"
          },
          "settingKey": "delivery_minutes",
          "settingValue": "30",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9cc"
          },
          "settingKey": "points_step",
          "settingValue": "10",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9cd"
          },
          "settingKey": "points_step_value",
          "settingValue": "2000",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9ce"
          },
          "settingKey": "store_name",
          "settingValue": "Aura Caf├⌐",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9cf"
          },
          "settingKey": "store_address",
          "settingValue": "28 Tr├áng Tiß╗ün, Ho├án Kiß║┐m, H├á Nß╗Öi",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9d0"
          },
          "settingKey": "store_hotline",
          "settingValue": "1900 6868",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9d1"
          },
          "settingKey": "points_earn_unit",
          "settingValue": "1000",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9d2"
          },
          "settingKey": "shift_morning",
          "settingValue": "07:00-12:00",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9d3"
          },
          "settingKey": "shift_afternoon",
          "settingValue": "12:00-17:00",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9d4"
          },
          "settingKey": "shift_evening",
          "settingValue": "17:00-22:00",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272938"
            }
          }
        }
      ]
    },
    {
      "name": "suppliers",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "name": "Fresh Bean Supplier",
          "phone": "0911000001",
          "address": "Dong Da, Hanoi",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272799"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272799"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab961"
          },
          "name": "Dairy and Syrup Co.",
          "phone": "0911000002",
          "address": "Cau Giay, Hanoi",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272800"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272800"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab962"
          },
          "name": "Bakery Ingredient Supply",
          "phone": "0911000003",
          "address": "Ba Dinh, Hanoi",
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272800"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272800"
            }
          }
        }
      ]
    },
    {
      "name": "userrewards",
      "indexes": [],
      "documents": []
    },
    {
      "name": "users",
      "indexes": [
        {
          "key": {
            "phone": {
              "$numberInt": "1"
            }
          },
          "name": "phone_1",
          "unique": true
        },
        {
          "key": {
            "emailKey": {
              "$numberInt": "1"
            }
          },
          "name": "emailKey_1",
          "unique": true,
          "partialFilterExpression": {
            "emailKey": {
              "$type": "string"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "fullName": "Aura Admin",
          "phone": "0900000001",
          "email": "admin@auracafe.vn",
          "address": "28 Tr├áng Tiß╗ün, Ho├án Kiß║┐m, H├á Nß╗Öi",
          "role": "ADMIN",
          "status": "ACTIVE",
          "position": "MANAGER",
          "baseSalary": {
            "$numberInt": "15000000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1735689600000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "admin@auracafe.vn",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272765"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272765"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "fullName": "Nguyen Van An",
          "phone": "0900000002",
          "email": "an@auracafe.vn",
          "address": "─Éß╗æng ─Éa, H├á Nß╗Öi",
          "role": "STAFF",
          "status": "ACTIVE",
          "position": "BARISTA",
          "baseSalary": {
            "$numberInt": "8000000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1738368000000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "an@auracafe.vn",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "fullName": "Tran Thi Binh",
          "phone": "0900000003",
          "email": "binh@auracafe.vn",
          "address": "Cß║ºu Giß║Ñy, H├á Nß╗Öi",
          "role": "STAFF",
          "status": "ACTIVE",
          "position": "CASHIER",
          "baseSalary": {
            "$numberInt": "8500000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1738368000000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "binh@auracafe.vn",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "fullName": "Le Minh Anh",
          "phone": "0900000004",
          "email": "anh@gmail.com",
          "address": "Ho├án Kiß║┐m, H├á Nß╗Öi",
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "165"
          },
          "emailKey": "anh@gmail.com",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793816725248"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "fullName": "Pham Quang Huy",
          "phone": "0900000005",
          "email": "huy@gmail.com",
          "address": "Cß║ºu Giß║Ñy, H├á Nß╗Öi",
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "195"
          },
          "emailKey": "huy@gmail.com",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794058430042"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "fullName": "Hoang Van Nam",
          "phone": "0900000006",
          "email": "nam@auracafe.vn",
          "address": "Ba ─É├¼nh, H├á Nß╗Öi",
          "role": "STAFF",
          "status": "ACTIVE",
          "position": "SHIPPER",
          "baseSalary": {
            "$numberInt": "7500000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1740787200000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "nam@auracafe.vn",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272767"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aef2566965dbc8f45a5c451"
          },
          "fullName": "Nguyễn Quốc Nguyên",
          "phone": "0965916512",
          "email": "nguyen@gmail.com",
          "checkoutRevision": {
            "$numberInt": "1"
          },
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "45"
          },
          "emailKey": "nguyen@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794057574459"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794059025501"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af4adf04c7b6bf45fbf1621"
          },
          "fullName": "Nguyên Nguyễn Quốc",
          "phone": "0965916511",
          "email": "nguyen.nguyenquoc2004@gmail.com",
          "checkoutRevision": {
            "$numberInt": "2"
          },
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "131"
          },
          "emailKey": "nguyen.nguyenquoc2004@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794420208785"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467933559"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "passwordChangedAt": {
            "$date": {
              "$numberLong": "1794421711431"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "fullName": "Nguyên Nguyễn Quốc",
          "phone": "09999999999",
          "email": "nguyenship@gmail.com",
          "checkoutRevision": {
            "$numberInt": "0"
          },
          "role": "STAFF",
          "status": "ACTIVE",
          "position": "SHIPPER",
          "baseSalary": {
            "$numberInt": "300000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "nguyenship@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794422837761"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794422837761"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af81a2b71c9bfcf1909e059"
          },
          "fullName": "Nguyên Nguyễn Quốc",
          "phone": "0123456789",
          "email": "nguyen1@gmail.com",
          "checkoutRevision": {
            "$numberInt": "0"
          },
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "nguyen1@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794644523583"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794644523583"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af81dbe69de2b6fbbb5e754"
          },
          "fullName": "Nguyên Quốc",
          "phone": "0123456799",
          "email": "hi@gmail.com",
          "checkoutRevision": {
            "$numberInt": "0"
          },
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "hi@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794645438990"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794645438990"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af820f7aa6774a3bac09320"
          },
          "fullName": "Nguyễn Văn B",
          "phone": "0123456999",
          "email": "b@gmail.com",
          "checkoutRevision": {
            "$numberInt": "0"
          },
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "b@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794646263912"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794646263912"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    },
    {
      "name": "vouchers",
      "indexes": [
        {
          "key": {
            "code": {
              "$numberInt": "1"
            }
          },
          "name": "code_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb60d1ed700e37819df85a"
          },
          "code": "WELCOME10",
          "discountType": "PERCENT",
          "discountValue": {
            "$numberInt": "10"
          },
          "minOrderValue": {
            "$numberInt": "50000"
          },
          "maxDiscount": {
            "$numberInt": "30000"
          },
          "usageLimit": {
            "$numberInt": "100"
          },
          "usedCount": {
            "$numberInt": "0"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb60d1ed700e37819df85b"
          },
          "code": "AURA20000",
          "discountType": "FIXED_AMOUNT",
          "discountValue": {
            "$numberInt": "20000"
          },
          "minOrderValue": {
            "$numberInt": "100000"
          },
          "usageLimit": {
            "$numberInt": "50"
          },
          "usedCount": {
            "$numberInt": "0"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb60d1ed700e37819df85c"
          },
          "code": "SUMMER15",
          "discountType": "PERCENT",
          "discountValue": {
            "$numberInt": "15"
          },
          "minOrderValue": {
            "$numberInt": "80000"
          },
          "maxDiscount": {
            "$numberInt": "25000"
          },
          "usageLimit": {
            "$numberInt": "200"
          },
          "usedCount": {
            "$numberInt": "0"
          },
          "status": "ACTIVE",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793810641827"
            }
          }
        }
      ]
    },
    {
      "name": "workschedules",
      "indexes": [
        {
          "key": {
            "user": {
              "$numberInt": "1"
            },
            "workDate": {
              "$numberInt": "1"
            },
            "shiftName": {
              "$numberInt": "1"
            }
          },
          "name": "user_1_workDate_1_shiftName_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab949"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1790985600000"
            }
          },
          "shiftName": "MORNING",
          "checkInTime": {
            "$date": {
              "$numberLong": "1791014400000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1791028800000"
            }
          },
          "status": "COMPLETED",
          "note": "Morning shift",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94a"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1790985600000"
            }
          },
          "shiftName": "AFTERNOON",
          "checkInTime": {
            "$date": {
              "$numberLong": "1791028800000"
            }
          },
          "startingCash": {
            "$numberInt": "500000"
          },
          "status": "PRESENT",
          "note": "Cashier shift",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94b"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1790985600000"
            }
          },
          "shiftName": "EVENING",
          "status": "SCHEDULED",
          "note": "Delivery shift",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94c"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1790985600000"
            }
          },
          "shiftName": "AFTERNOON",
          "checkInTime": {
            "$date": {
              "$numberLong": "1791028800000"
            }
          },
          "status": "PRESENT",
          "note": "Barista ca chiß╗üu",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab94d"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1790985600000"
            }
          },
          "shiftName": "EVENING",
          "status": "SCHEDULED",
          "note": "Quß║ún l├╜ trß╗▒c ca tß╗æi",
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1793812272778"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4b73b0b44b941144fb2aa"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794355200000"
            }
          },
          "shiftName": "Ca đêm",
          "shift": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794422587406"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794424770192"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794333600000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794373200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4b85b0b44b941144fb4d0"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794355200000"
            }
          },
          "shiftName": "Ca đêm",
          "shift": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794422875121"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794424766294"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794333600000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794373200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4bfd56c62c988a55af322"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "Ca đêm",
          "shift": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "codPaymentIds": [
            {
              "$oid": "6af4c0616c62c988a55af3bd"
            }
          ],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "Nộp COD 71000",
          "createdAt": {
            "$date": {
              "$numberLong": "1794424789163"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425714128"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794424894356"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794425572653"
            }
          },
          "endingCashActual": {
            "$numberInt": "71000"
          },
          "endingCashSystem": {
            "$numberInt": "71000"
          },
          "remittanceId": "9e370fe8-1d7f-403a-a39c-16eb489707e5",
          "codReceivedAmount": {
            "$numberInt": "71000"
          },
          "codReceivedAt": {
            "$date": {
              "$numberLong": "1794425714122"
            }
          },
          "codReceivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "codReceivedNote": "",
          "codReceivingSchedule": {
            "$oid": "6af4c3046c62c988a55af491"
          }
        },
        {
          "_id": {
            "$oid": "6af4c2736c62c988a55af432"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "Ca đêm",
          "shift": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794425459442"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425483422"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794425483420"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af4c3046c62c988a55af491"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "Ca đêm",
          "shift": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "1"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794425604567"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794425714131"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794425641242"
            }
          },
          "startingCash": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af567211303905617b70b58"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "ca chieu",
          "shift": {
            "$oid": "6af566fb1303905617b70b46"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467617460"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467816018"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794467816009"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af567271303905617b70b59"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "ca chieu",
          "shift": {
            "$oid": "6af566fb1303905617b70b46"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467623758"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467818986"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794467818982"
            }
          },
          "startingCash": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af567391303905617b70b5a"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794441600000"
            }
          },
          "shiftName": "ca chieu",
          "shift": {
            "$oid": "6af566fb1303905617b70b46"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467641876"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467819861"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794467819854"
            }
          }
        }
      ]
    },
    {
      "name": "workshifts",
      "indexes": [
        {
          "key": {
            "weekStart": {
              "$numberInt": "1"
            },
            "shiftName": {
              "$numberInt": "1"
            }
          },
          "name": "weekStart_1_shiftName_1",
          "unique": true
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6af4b71f0b44b941144fb299"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794182400000"
            }
          },
          "shiftName": "Ca đêm",
          "startTime": "01:00",
          "endTime": "12:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794422559903"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794422559903"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af566fb1303905617b70b46"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794182400000"
            }
          },
          "shiftName": "ca chieu",
          "startTime": "13:00",
          "endTime": "22:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794467579779"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794467579779"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        }
      ]
    }
  ]
};
// END EMBEDDED SEED DATA

const getSnapshot = () => EJSON.deserialize(seedData);

// Export only reads MongoDB and refreshes the embedded data in this file.
async function exportSeed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp');
  const db = mongoose.connection.db;
  const snapshot = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceDatabase: db.databaseName,
    notes: 'Real password hashes and password recovery sessions are excluded. Seeded accounts use SEED_USER_PASSWORD.',
    collections: []
  };
  const collections = (await db.listCollections().toArray()).filter(info => info.type === 'collection' && !info.name.startsWith('system.') && info.name !== 'passwordrecoveries').sort((a, b) => a.name.localeCompare(b.name));
  for (const info of collections) {
    const collection = db.collection(info.name);
    const documents = await collection.find({}).sort({ _id: 1 }).toArray();
    if (info.name === 'users') for (const user of documents) delete user.passwordHash;
    const indexes = (await collection.indexes()).filter(index => index.name !== '_id_').map(({ key, name, unique, sparse, expireAfterSeconds, partialFilterExpression, collation }) => ({ key, name, ...(unique ? { unique } : {}), ...(sparse ? { sparse } : {}), ...(expireAfterSeconds !== undefined ? { expireAfterSeconds } : {}), ...(partialFilterExpression ? { partialFilterExpression } : {}), ...(collation ? { collation } : {}) }));
    snapshot.collections.push({ name: info.name, indexes, documents });
  }
  const source = await fs.readFile(__filename, 'utf8');
  const startMarker = '// BEGIN EMBEDDED SEED DATA';
  const endMarker = '// END EMBEDDED SEED DATA';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Embedded seed markers are missing.');
  const serialized = EJSON.stringify(snapshot, null, 2, { relaxed: false });
  if (EJSON.parse(serialized).collections.length !== snapshot.collections.length) throw new Error('Snapshot verification failed.');
  await fs.writeFile(__filename, source.slice(0, start) + startMarker + '\nconst seedData = ' + serialized + ';\n' + source.slice(end));
  console.log(`Exported ${db.databaseName} into seed.js (${snapshot.collections.length} collections).`);
}

async function importData() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('Local seed requires ALLOW_DESTRUCTIVE_SEED=true and replaces the embedded seed collections.');
  }
  const password = process.env.SEED_USER_PASSWORD || 'AuraCafe123!';
  const invalidPassword = passwordError(password);
  if (invalidPassword) throw new Error(`SEED_USER_PASSWORD: ${invalidPassword}`);
  const snapshot = getSnapshot();
  if (snapshot.formatVersion !== 1 || !Array.isArray(snapshot.collections) || !snapshot.collections.some(item => item.name === 'users')) throw new Error('Invalid seed snapshot.');
  const names = new Set();
  for (const item of snapshot.collections) {
    if (!/^[a-z][a-z0-9_]*$/.test(item.name) || names.has(item.name) || !Array.isArray(item.documents) || !Array.isArray(item.indexes)) throw new Error('Invalid seed collection.');
    names.add(item.name);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp');
  const db = mongoose.connection.db;
  console.log(`Restoring snapshot from ${snapshot.sourceDatabase} (${snapshot.exportedAt}) into ${db.databaseName}`);
  for (const item of snapshot.collections) {
    if (item.name === 'users') for (const user of item.documents) user.passwordHash = passwordHash;
    // Preserve snapshot IDs so every reference, embedded item and inventory lot stays linked.
    // Recreate indexes with the data instead of retaining outdated unique indexes.
    try { await db.collection(item.name).drop(); } catch (error) { if (error.code !== 26) throw error; }
    await db.createCollection(item.name);
    const collection = db.collection(item.name);
    if (item.documents.length) await collection.insertMany(item.documents, { ordered: true });
    for (const index of item.indexes) {
      const { key, ...options } = index;
      await collection.createIndex(key, options);
    }
    const count = await collection.countDocuments();
    if (count !== item.documents.length) throw new Error(`Count mismatch: ${item.name}`);
    console.log(`${item.name}: ${count}`);
  }
  // OTPs and reset tokens are short-lived secrets and cannot be seeded.
  await db.collection('passwordrecoveries').deleteMany({});
  console.log('Seed restored. Existing live database passwords were not exported; seeded accounts use SEED_USER_PASSWORD (default: AuraCafe123!).');
}

if (require.main === module) (process.argv.includes('--export') ? exportSeed() : importData()).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { importData, getSnapshot };
