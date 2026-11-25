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
  "exportedAt": "2026-11-25T15:51:59.470Z",
  "sourceDatabase": "aura_cafe_erp",
  "notes": "Shared local demo fixture with staff, orders, inventory, purchase and handover states. Password hashes and reset tokens are excluded; seeded accounts use SEED_USER_PASSWORD.",
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
            "$numberInt": "4"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1793814861212"
            }
          },
          "items": [],
          "updatedAt": {
            "$date": {
              "$numberLong": "1794684822570"
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
          "name": "Cà phê máy",
          "icon": "coffee_maker",
          "description": "Espresso, Caramel Macchiato đậm đà chuẩn gu hiện đại.",
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
          "name": "Cà phê truyền thống",
          "icon": "local_cafe",
          "description": "Cà phê muối, sữa đá Sài Gòn ủ phin nguyên bản ngọt êm.",
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
          "name": "Trà trái cây",
          "icon": "emoji_food_beverage",
          "description": "Trà đào cam sả, hoa quả nhiệt đới tươi mát thanh nhiệt.",
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
          "name": "Đá xay & Matcha",
          "icon": "icecream",
          "description": "Matcha Uji thơm bùi, đá xay mát lạnh đánh tan ngày hè.",
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
          "name": "Bánh ngọt",
          "icon": "bakery_dining",
          "description": "Bánh Croissant nướng bơ Pháp, cheesecake mềm béo hấp dẫn.",
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
          "name": "Đóng chai",
          "icon": "liquor",
          "description": "Cold brew ủ lạnh 16h đóng chai tiện lợi mang đi bất cứ đâu.",
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
            "$oid": "68e0acd6ea648716cf2c17fc"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "issueType": "COMPLAINT",
          "topic": "Thời gian phục vụ",
          "content": "Khách phản ánh món ra chậm; quản lý đang xác minh.",
          "status": "IN_PROGRESS",
          "adminResponse": "Quán đã tiếp nhận và đang kiểm tra ca phục vụ.",
          "respondedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "respondedAt": {
            "$date": {
              "$numberLong": "1795233600000"
            }
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795230000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795233600000"
            }
          }
        },
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
        },
        {
          "_id": {
            "$oid": "6af8a44d1dc7407ccb05eb27"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "issueType": "RATING",
          "rating": {
            "$numberInt": "5"
          },
          "content": "ngon",
          "attachments": [],
          "status": "PENDING",
          "submissionKey": "6aeb673031b031ff6bfab946:6af8a39d1dc7407ccb05eaa2",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679885163"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679885163"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "b8a696f9f59e6e5e081a521f"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98d"
          },
          "issueType": "COMPLAINT",
          "topic": "Phản ánh trùng lặp",
          "content": "Khách gửi lại cùng một phản ánh đã được xử lý.",
          "status": "REJECTED",
          "adminResponse": "Phản ánh này trùng với yêu cầu trước; vui lòng theo dõi phản hồi cũ.",
          "respondedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "respondedAt": {
            "$date": {
              "$numberLong": "1795320000000"
            }
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795316400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795320000000"
            }
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
      "name": "deliveryissues",
      "indexes": [
        {
          "key": {
            "order": {
              "$numberInt": "1"
            }
          },
          "name": "order_1"
        },
        {
          "key": {
            "reporter": {
              "$numberInt": "1"
            }
          },
          "name": "reporter_1"
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "d2ae5d64df40791dba067260"
          },
          "order": {
            "$oid": "6aeb673031b031ff6bfab98e"
          },
          "reporter": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "issueType": "DELAY",
          "description": "Khách yêu cầu giao trễ 15 phút; đã liên hệ xác nhận.",
          "outcome": "REPORT",
          "createdAt": {
            "$date": {
              "$numberLong": "1794643200000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794643200000"
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
            "$oid": "058acaf05eed774b975fe1bc"
          },
          "name": "Bánh croissant thành phẩm",
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "unit": "cái",
          "isActive": true,
          "currentStock": {
            "$numberInt": "98"
          },
          "minStockLevel": {
            "$numberInt": "10"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "81b835ff3d40d18822b382e9"
              },
              "sourceType": "OPENING",
              "sourceId": "SEED-OPENING-croissant",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794686733611"
                }
              },
              "quantity": {
                "$numberInt": "100"
              },
              "remainingQuantity": {
                "$numberInt": "98"
              },
              "unitCost": {
                "$numberInt": "18000"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "3661198b623f59b138dc83e6"
          },
          "name": "Hạnh nhân lát",
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "unit": "g",
          "isActive": true,
          "currentStock": {
            "$numberInt": "2000"
          },
          "minStockLevel": {
            "$numberInt": "200"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "89c8567dbbc149ca438c1f71"
              },
              "sourceType": "OPENING",
              "sourceId": "SEED-OPENING-almond",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794686733611"
                }
              },
              "quantity": {
                "$numberInt": "2000"
              },
              "remainingQuantity": {
                "$numberInt": "2000"
              },
              "unitCost": {
                "$numberInt": "250"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "4990da8f82da567423a05687"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "name": "Đường nâu",
          "unit": "gram",
          "isActive": true,
          "currentStock": {
            "$numberInt": "250"
          },
          "minStockLevel": {
            "$numberInt": "1000"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "71ceacdc459eb3561aa3579a"
              },
              "sourceType": "OPENING",
              "sourceId": "DEMO-OPENING-brown-sugar",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1795395600000"
                }
              },
              "quantity": {
                "$numberInt": "250"
              },
              "remainingQuantity": {
                "$numberInt": "250"
              },
              "unitCost": {
                "$numberInt": "65"
              }
            }
          ]
        },
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
            "$numberInt": "9736"
          },
          "minStockLevel": {
            "$numberInt": "2000"
          },
          "lotsVersion": {
            "$numberInt": "11"
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
                "$numberInt": "9736"
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
            "$numberInt": "19260"
          },
          "minStockLevel": {
            "$numberInt": "5000"
          },
          "lotsVersion": {
            "$numberInt": "4"
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
                "$numberInt": "19260"
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
            "$numberInt": "4"
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
              "unitCost": {
                "$numberDouble": "86.0832137733142"
              },
              "_id": {
                "$oid": "6aef2649965dbc8f45a5c45d"
              }
            }
          ],
          "stockValuation": {
            "quantity": {
              "$numberInt": "6970"
            },
            "totalCost": {
              "$numberInt": "600000"
            },
            "updatedAt": {
              "$date": {
                "$numberLong": "1794680325946"
              }
            },
            "updatedBy": {
              "$oid": "6aeb673031b031ff6bfab943"
            }
          }
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
                "$numberInt": "250"
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
        },
        {
          "_id": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "supplier": {
            "$oid": "6af8aa381dc7407ccb05f828"
          },
          "name": "sữa ông thọ",
          "isActive": true,
          "unit": "ml",
          "currentStock": {
            "$numberInt": "19600"
          },
          "minStockLevel": {
            "$numberInt": "1000"
          },
          "lotsVersion": {
            "$numberInt": "4"
          },
          "__v": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "sourceType": "PURCHASE",
              "sourceId": "6af8ac57fcfef0a0c28d4361",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794681958202"
                }
              },
              "quantity": {
                "$numberInt": "20000"
              },
              "remainingQuantity": {
                "$numberInt": "19600"
              },
              "unitCost": {
                "$numberInt": "85"
              },
              "_id": {
                "$oid": "6af8ac66fcfef0a0c28d4363"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "6cbbe4ef97fbd0710a9f6373"
          },
          "name": "Bột sôcôla Bỉ",
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "unit": "g",
          "isActive": true,
          "currentStock": {
            "$numberInt": "5000"
          },
          "minStockLevel": {
            "$numberInt": "500"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "a267d34c93d75bc6506411ed"
              },
              "sourceType": "OPENING",
              "sourceId": "SEED-OPENING-chocolate",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794686733611"
                }
              },
              "quantity": {
                "$numberInt": "5000"
              },
              "remainingQuantity": {
                "$numberInt": "5000"
              },
              "unitCost": {
                "$numberInt": "180"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "f6b67060d00c497af05d4e85"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "name": "Hạt cà phê Arabica",
          "unit": "gram",
          "isActive": true,
          "currentStock": {
            "$numberInt": "120"
          },
          "minStockLevel": {
            "$numberInt": "500"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "9259a2e7791cb713ff222112"
              },
              "sourceType": "OPENING",
              "sourceId": "DEMO-OPENING-arabica",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1795395600000"
                }
              },
              "quantity": {
                "$numberInt": "120"
              },
              "remainingQuantity": {
                "$numberInt": "120"
              },
              "unitCost": {
                "$numberInt": "480"
              }
            }
          ]
        },
        {
          "_id": {
            "$oid": "fadf568441a051bcd8a1ee84"
          },
          "name": "Bột matcha Uji",
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "unit": "g",
          "isActive": true,
          "currentStock": {
            "$numberInt": "3000"
          },
          "minStockLevel": {
            "$numberInt": "300"
          },
          "lotsVersion": {
            "$numberInt": "0"
          },
          "stockLots": [
            {
              "_id": {
                "$oid": "74fa7e025bab40a895a90cd4"
              },
              "sourceType": "OPENING",
              "sourceId": "SEED-OPENING-matcha",
              "receivedAt": {
                "$date": {
                  "$numberLong": "1794686733611"
                }
              },
              "quantity": {
                "$numberInt": "3000"
              },
              "remainingQuantity": {
                "$numberInt": "3000"
              },
              "unitCost": {
                "$numberInt": "500"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "inventorytransactions",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "24519c0a9b0ce85446bc1f3f"
          },
          "ingredient": {
            "$oid": "058acaf05eed774b975fe1bc"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "1"
          },
          "stockBefore": {
            "$numberInt": "99"
          },
          "stockAfter": {
            "$numberInt": "98"
          },
          "stockDelta": {
            "$numberInt": "-1"
          },
          "unitBefore": "cái",
          "unitAfter": "cái",
          "valueBefore": {
            "$numberInt": "1782000"
          },
          "valueAfter": {
            "$numberInt": "1764000"
          },
          "costTotal": {
            "$numberInt": "18000"
          },
          "lotAllocations": [
            {
              "_id": {
                "$oid": "6277e4d9efa205bb33b0b4ea"
              },
              "lotId": {
                "$oid": "81b835ff3d40d18822b382e9"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "unitCost": {
                "$numberInt": "18000"
              }
            }
          ],
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "17dd10ba0c54b2d76f32116f"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "note": "Xuất kho cho đơn AURA-DEMO-DELIVERING",
          "createdAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "43dc328b52e14228cb17251b"
          },
          "ingredient": {
            "$oid": "4990da8f82da567423a05687"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "250"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "250"
          },
          "stockDelta": {
            "$numberInt": "250"
          },
          "unitBefore": "gram",
          "unitAfter": "gram",
          "referenceType": "ADJUSTMENT",
          "note": "Tồn đầu kỳ demo; cần bổ sung hàng",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "16250"
          },
          "costTotal": {
            "$numberInt": "16250"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795395600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795395600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "46114ceb52c4d22d1d60b0cf"
          },
          "ingredient": {
            "$oid": "058acaf05eed774b975fe1bc"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "100"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "100"
          },
          "stockDelta": {
            "$numberInt": "100"
          },
          "unitBefore": "cái",
          "unitAfter": "cái",
          "referenceType": "ADJUSTMENT",
          "note": "SEED: tồn đầu kỳ cho nguyên liệu bổ sung",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "1800000"
          },
          "costTotal": {
            "$numberInt": "1800000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "4b269c51d985e4633fb0a32e"
          },
          "ingredient": {
            "$oid": "3661198b623f59b138dc83e6"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "2000"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "2000"
          },
          "stockDelta": {
            "$numberInt": "2000"
          },
          "unitBefore": "g",
          "unitAfter": "g",
          "referenceType": "ADJUSTMENT",
          "note": "SEED: tồn đầu kỳ cho nguyên liệu bổ sung",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "500000"
          },
          "costTotal": {
            "$numberInt": "500000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
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
        },
        {
          "_id": {
            "$oid": "6af8915d633d649bec85d422"
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
            "$oid": "6af890ac633d649bec85d3b2"
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
                "$oid": "6af8915d633d649bec85d425"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794675037087"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794675037087"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8915d633d649bec85d423"
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
            "$oid": "6af890ac633d649bec85d3b2"
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
                "$oid": "6af8915d633d649bec85d427"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794675037088"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794675037088"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a3f41dc7407ccb05eac9"
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
            "$oid": "6af8a39d1dc7407ccb05eaa2"
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
                "$oid": "6af8a3f41dc7407ccb05eacb"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794679796060"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679796060"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a5a01dc7407ccb05ed5d"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "48"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-48"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af8a5351dc7407ccb05eca1"
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
                "$numberInt": "48"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af8a5a01dc7407ccb05ed60"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794680224380"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680224380"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a5a01dc7407ccb05ed5e"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "180"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-180"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af8a5351dc7407ccb05eca1"
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
                "$numberInt": "180"
              },
              "unitCost": null,
              "_id": {
                "$oid": "6af8a5a01dc7407ccb05ed62"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794680224383"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680224383"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a6b91dc7407ccb05f12b"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab968"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "0"
          },
          "stockBefore": {
            "$numberInt": "1050"
          },
          "stockAfter": {
            "$numberInt": "1050"
          },
          "valueBefore": {
            "$numberInt": "200000"
          },
          "valueAfter": {
            "$numberInt": "250000"
          },
          "stockDelta": {
            "$numberInt": "0"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": "6af5692f1303905617b70d85",
          "note": "Sửa đơn giá phiếu nhập từ 200 thành 250.",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "50000"
          },
          "lotAllocations": [],
          "createdAt": {
            "$date": {
              "$numberLong": "1794680505343"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680505343"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a9be1dc7407ccb05f5ef"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab963"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "0"
          },
          "stockBefore": {
            "$numberInt": "9736"
          },
          "stockAfter": {
            "$numberInt": "9736"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "0"
          },
          "stockDelta": {
            "$numberInt": "0"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": "6aeb673031b031ff6bfab9bc",
          "note": "Sửa đơn giá phiếu nhập từ 400 thành 400.",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "0"
          },
          "lotAllocations": [],
          "createdAt": {
            "$date": {
              "$numberLong": "1794681278606"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681278606"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8abfbfcfef0a0c28d42b1"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "0"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "0"
          },
          "unitBefore": "gram",
          "unitAfter": "ml",
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "0"
          },
          "stockDelta": {
            "$numberInt": "0"
          },
          "referenceType": "ADJUSTMENT",
          "note": "Sửa nguyên liệu: điều chỉnh số tồn, đơn vị hoặc giá trị tồn.",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "0"
          },
          "lotAllocations": [],
          "createdAt": {
            "$date": {
              "$numberLong": "1794681851231"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681851231"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8ac66fcfef0a0c28d4366"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "transactionType": "IN_PURCHASE",
          "quantity": {
            "$numberInt": "20000"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "20000"
          },
          "referenceType": "PURCHASE_ORDER",
          "referenceId": {
            "$oid": "6af8ac57fcfef0a0c28d4361"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "costTotal": {
            "$numberInt": "1700000"
          },
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6af8ac66fcfef0a0c28d4363"
              },
              "quantity": {
                "$numberInt": "20000"
              },
              "unitCost": {
                "$numberInt": "85"
              },
              "_id": {
                "$oid": "6af8ac66fcfef0a0c28d4368"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794681958223"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681958223"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8acdffcfef0a0c28d4536"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "200"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-200"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af8acccfcfef0a0c28d44fc"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": {
            "$numberInt": "17000"
          },
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6af8ac66fcfef0a0c28d4363"
              },
              "quantity": {
                "$numberInt": "200"
              },
              "unitCost": {
                "$numberInt": "85"
              },
              "_id": {
                "$oid": "6af8acdffcfef0a0c28d4538"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794682079461"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682079461"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8af99dd892966174aa75c"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "200"
          },
          "valueBefore": null,
          "valueAfter": null,
          "stockDelta": {
            "$numberInt": "-200"
          },
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "6af8af7edd892966174aa711"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "costTotal": {
            "$numberInt": "17000"
          },
          "lotAllocations": [
            {
              "lotId": {
                "$oid": "6af8ac66fcfef0a0c28d4363"
              },
              "quantity": {
                "$numberInt": "200"
              },
              "unitCost": {
                "$numberInt": "85"
              },
              "_id": {
                "$oid": "6af8af99dd892966174aa75e"
              }
            }
          ],
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794682777674"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682777674"
            }
          }
        },
        {
          "_id": {
            "$oid": "7ebc5843876bca55df12b45e"
          },
          "ingredient": {
            "$oid": "058acaf05eed774b975fe1bc"
          },
          "transactionType": "OUT_ORDER",
          "quantity": {
            "$numberInt": "1"
          },
          "stockBefore": {
            "$numberInt": "100"
          },
          "stockAfter": {
            "$numberInt": "99"
          },
          "stockDelta": {
            "$numberInt": "-1"
          },
          "unitBefore": "cái",
          "unitAfter": "cái",
          "valueBefore": {
            "$numberInt": "1800000"
          },
          "valueAfter": {
            "$numberInt": "1782000"
          },
          "costTotal": {
            "$numberInt": "18000"
          },
          "lotAllocations": [
            {
              "_id": {
                "$oid": "f81de1996308f63692acdf3b"
              },
              "lotId": {
                "$oid": "81b835ff3d40d18822b382e9"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "unitCost": {
                "$numberInt": "18000"
              }
            }
          ],
          "referenceType": "ORDER",
          "referenceId": {
            "$oid": "df1640b1d2e2c9b927aaac60"
          },
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "note": "Xuất kho cho đơn AURA-DEMO-PREPARING",
          "createdAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "9fc1996b45947f7d5e562576"
          },
          "ingredient": {
            "$oid": "fadf568441a051bcd8a1ee84"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "3000"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "3000"
          },
          "stockDelta": {
            "$numberInt": "3000"
          },
          "unitBefore": "g",
          "unitAfter": "g",
          "referenceType": "ADJUSTMENT",
          "note": "SEED: tồn đầu kỳ cho nguyên liệu bổ sung",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "1500000"
          },
          "costTotal": {
            "$numberInt": "1500000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "bb9bbdcde941f463d2188893"
          },
          "ingredient": {
            "$oid": "6cbbe4ef97fbd0710a9f6373"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "5000"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "5000"
          },
          "stockDelta": {
            "$numberInt": "5000"
          },
          "unitBefore": "g",
          "unitAfter": "g",
          "referenceType": "ADJUSTMENT",
          "note": "SEED: tồn đầu kỳ cho nguyên liệu bổ sung",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "900000"
          },
          "costTotal": {
            "$numberInt": "900000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "d8a9e03b0f898f69f740a7d6"
          },
          "ingredient": {
            "$oid": "f6b67060d00c497af05d4e85"
          },
          "transactionType": "ADJUSTMENT",
          "quantity": {
            "$numberInt": "120"
          },
          "stockBefore": {
            "$numberInt": "0"
          },
          "stockAfter": {
            "$numberInt": "120"
          },
          "stockDelta": {
            "$numberInt": "120"
          },
          "unitBefore": "gram",
          "unitAfter": "gram",
          "referenceType": "ADJUSTMENT",
          "note": "Tồn đầu kỳ demo; cần bổ sung hàng",
          "createdBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "valueBefore": {
            "$numberInt": "0"
          },
          "valueAfter": {
            "$numberInt": "57600"
          },
          "costTotal": {
            "$numberInt": "57600"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795395600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795395600000"
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
        },
        {
          "_id": {
            "$oid": "6af890ef633d649bec85d3bd"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af890ac633d649bec85d3b2"
          },
          "pointsChange": {
            "$numberInt": "39"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794674927081"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674927086"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "204"
          }
        },
        {
          "_id": {
            "$oid": "6af8a39d1dc7407ccb05eaa5"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "pointsChange": {
            "$numberInt": "-200"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679709691"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679709691"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a3b91dc7407ccb05eaae"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "pointsChange": {
            "$numberInt": "5"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679737605"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679737613"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "9"
          }
        },
        {
          "_id": {
            "$oid": "6af8a4b51dc7407ccb05ec5f"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsChange": {
            "$numberInt": "1000"
          },
          "balanceAfter": {
            "$numberInt": "1009"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "ADJUST",
          "reason": "Cộng điểm thủ công tại quầy",
          "performedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794679989638"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679989638"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a4b81dc7407ccb05ec64"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsChange": {
            "$numberInt": "10"
          },
          "balanceAfter": {
            "$numberInt": "1019"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "ADJUST",
          "reason": "Cộng điểm thủ công tại quầy",
          "performedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794679992095"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679992095"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a5351dc7407ccb05eca5"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "pointsChange": {
            "$numberInt": "-500"
          },
          "automatic": false,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "REDEEM",
          "createdAt": {
            "$date": {
              "$numberLong": "1794680117630"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680117630"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a54c1dc7407ccb05ecba"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "pointsChange": {
            "$numberInt": "23"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794680140273"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680140279"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "542"
          }
        },
        {
          "_id": {
            "$oid": "6af8afd5dd892966174aa7f0"
          },
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "order": {
            "$oid": "6af8af7edd892966174aa711"
          },
          "pointsChange": {
            "$numberInt": "55"
          },
          "automatic": true,
          "redemptionRefund": false,
          "earningReversal": false,
          "transactionType": "EARN",
          "reason": "Tích điểm thanh toán, không bao gồm phí giao hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682837955"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682837962"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "balanceAfter": {
            "$numberInt": "597"
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
            "$oid": "472d0d2cc9ec2f637dcae8b8"
          },
          "order": {
            "$oid": "3bcac1824571cc3df6b1ce56"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          }
        },
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
          "productNameAtTime": "Bánh Cheesecake Việt Quất",
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
          "productNameAtTime": "Caramel Macchiato Đặc Sản",
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
          "productNameAtTime": "Bánh Croissant Bơ Pháp",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "Tiêu chuẩn"
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "productNameAtTime": "Trà Đào Cam Sả Tươi",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "customization": {
            "size": "L",
            "ice": "Ít đá"
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "customization": {
            "size": "L",
            "ice": "Ít đá"
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
          "productNameAtTime": "Americano Đá Rang Đậm",
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "productNameAtTime": "Bánh Croissant Bơ Pháp",
          "unitPrice": {
            "$numberInt": "35000"
          },
          "customization": {
            "size": "Tiêu chuẩn"
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
          "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
          "productNameAtTime": "Bánh Cheesecake Việt Quất",
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
          "productNameAtTime": "Latte Nghệ Thuật Hạt Phỉ",
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
          "productNameAtTime": "Americano Đá Rang Đậm",
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
          "productNameAtTime": "Matcha Latte Uji Kyoto Đá Xay",
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
          "unitPrice": {
            "$numberInt": "53000"
          },
          "customization": {
            "size": "M",
            "sugar": "50%",
            "ice": "Đá chuẩn",
            "topping": [
              "Extra kem muối"
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
          "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
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
          "productNameAtTime": "Cà Phê Sữa Đá Sài Gòn Nâu",
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
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
          "unitPrice": {
            "$numberInt": "53000"
          },
          "customization": {
            "size": "M",
            "topping": [
              "Extra kem muối"
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
          "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
          "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
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
        },
        {
          "_id": {
            "$oid": "6af88a00633d649bec85d30a"
          },
          "order": {
            "$oid": "6af88a00633d649bec85d309"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95b"
          },
          "productNameAtTime": "Trà Sen Vàng Long Nhãn",
          "unitPrice": {
            "$numberInt": "49000"
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
            "$numberInt": "49000"
          },
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1794673152317"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794673152317"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af89066633d649bec85d386"
          },
          "order": {
            "$oid": "6af89066633d649bec85d385"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
          "unitPrice": {
            "$numberInt": "68000"
          },
          "customization": {
            "size": "Chai 250ml",
            "sugar": "50%",
            "ice": "Đá chuẩn"
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
              "$numberLong": "1794674790178"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674790178"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af890ac633d649bec85d3b3"
          },
          "order": {
            "$oid": "6af890ac633d649bec85d3b2"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab957"
          },
          "productNameAtTime": "Cà Phê Sữa Đá Sài Gòn Nâu",
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
              "$numberLong": "1794674860389"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794675042233"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a39d1dc7407ccb05eaa3"
          },
          "order": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "$numberLong": "1794679709685"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679797713"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a5351dc7407ccb05eca2"
          },
          "order": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab956"
          },
          "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
          "unitPrice": {
            "$numberInt": "68000"
          },
          "customization": {
            "size": "Chai 250ml",
            "sugar": "50%",
            "ice": "Đá chuẩn"
          },
          "quantity": {
            "$numberInt": "1"
          },
          "subtotal": {
            "$numberInt": "68000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794680117621"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680226238"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a5351dc7407ccb05eca3"
          },
          "order": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "productNameAtTime": "Caramel Macchiato Đặc Sản",
          "unitPrice": {
            "$numberInt": "55000"
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
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794680117624"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680227195"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8acccfcfef0a0c28d44fd"
          },
          "order": {
            "$oid": "6af8acccfcfef0a0c28d44fc"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "productNameAtTime": "Caramel Macchiato Đặc Sản",
          "unitPrice": {
            "$numberInt": "55000"
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
            "$numberInt": "55000"
          },
          "isPrepared": true,
          "createdAt": {
            "$date": {
              "$numberLong": "1794682060363"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682081438"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8af7edd892966174aa712"
          },
          "order": {
            "$oid": "6af8af7edd892966174aa711"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "productNameAtTime": "Caramel Macchiato Đặc Sản",
          "unitPrice": {
            "$numberInt": "55000"
          },
          "customization": {
            "size": "M"
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
              "$numberLong": "1794682750697"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682779288"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "a697258024679650433b5239"
          },
          "order": {
            "$oid": "17dd10ba0c54b2d76f32116f"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "productNameAtTime": "Bánh Croissant Bơ Pháp",
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
              "$numberLong": "1795575600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "de9bfd5c75cac6d30372b8c0"
          },
          "order": {
            "$oid": "df1640b1d2e2c9b927aaac60"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "productNameAtTime": "Bánh Croissant Bơ Pháp",
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
          "isPrepared": false,
          "createdAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
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
            "$oid": "17dd10ba0c54b2d76f32116f"
          },
          "orderCode": "AURA-DEMO-DELIVERING",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "12 Nguyễn Trãi, Thanh Xuân, Hà Nội",
          "district": "Thanh Xuân",
          "ward": "Thượng Đình",
          "addressDetail": "Số 12 Nguyễn Trãi",
          "orderType": "ONLINE",
          "status": "DELIVERING",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab959"
              },
              "productNameAtTime": "Bánh Croissant Bơ Pháp",
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
              "costTotal": {
                "$numberInt": "18000"
              },
              "costPerItem": {
                "$numberInt": "18000"
              },
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "058acaf05eed774b975fe1bc"
                  },
                  "ingredientName": "Bánh croissant thành phẩm",
                  "unit": "cái",
                  "lotId": {
                    "$oid": "81b835ff3d40d18822b382e9"
                  },
                  "quantity": {
                    "$numberInt": "1"
                  },
                  "unitCost": {
                    "$numberInt": "18000"
                  }
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "35000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "53000"
          },
          "paymentMethod": "COD",
          "shipper": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "delivery": {
            "status": "DELIVERING",
            "assignedAt": {
              "$date": {
                "$numberLong": "1795575600000"
              }
            },
            "acceptedAt": {
              "$date": {
                "$numberLong": "1795576200000"
              }
            },
            "pickedUpAt": {
              "$date": {
                "$numberLong": "1795577400000"
              }
            },
            "history": []
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          },
          "costTotal": {
            "$numberInt": "18000"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          },
          "costStatus": "COMPLETE",
          "createdAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "3bcac1824571cc3df6b1ce56"
          },
          "orderCode": "AURA-DEMO-QR-PENDING",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "12 Nguyễn Trãi, Thanh Xuân, Hà Nội",
          "district": "Thanh Xuân",
          "ward": "Thượng Đình",
          "addressDetail": "Số 12 Nguyễn Trãi",
          "orderType": "ONLINE",
          "status": "PENDING",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "isPrepared": false
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
          "paymentMethod": "BANK_TRANSFER",
          "createdAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          }
        },
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
              "productNameAtTime": "Bánh Cheesecake Việt Quất",
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
              "productNameAtTime": "Caramel Macchiato Đặc Sản",
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
              "productNameAtTime": "Bánh Croissant Bơ Pháp",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "Tiêu chuẩn"
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "productNameAtTime": "Trà Đào Cam Sả Tươi",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "customization": {
                "size": "L",
                "ice": "Ít đá"
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "customization": {
                "size": "L",
                "ice": "Ít đá"
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
              "productNameAtTime": "Americano Đá Rang Đậm",
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "productNameAtTime": "Bánh Croissant Bơ Pháp",
              "unitPrice": {
                "$numberInt": "35000"
              },
              "customization": {
                "size": "Tiêu chuẩn"
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
              "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
              "productNameAtTime": "Bánh Cheesecake Việt Quất",
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
              "productNameAtTime": "Latte Nghệ Thuật Hạt Phỉ",
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
              "productNameAtTime": "Americano Đá Rang Đậm",
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
              "productNameAtTime": "Matcha Latte Uji Kyoto Đá Xay",
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
              "unitPrice": {
                "$numberInt": "53000"
              },
              "customization": {
                "size": "M",
                "sugar": "50%",
                "ice": "Đá chuẩn",
                "topping": [
                  "Extra kem muối"
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
              "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
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
              "productNameAtTime": "Cà Phê Sữa Đá Sài Gòn Nâu",
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
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
              "unitPrice": {
                "$numberInt": "53000"
              },
              "customization": {
                "size": "M",
                "topping": [
                  "Extra kem muối"
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
              "productNameAtTime": "Trà Đào Cam Sả Tươi",
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
              "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
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
        },
        {
          "_id": {
            "$oid": "6af88a00633d649bec85d309"
          },
          "orderCode": "AURA-MWGM22W6-B3E6EE67",
          "checkoutFlow": false,
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
          "status": "CANCELLED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab95b"
              },
              "productNameAtTime": "Trà Sen Vàng Long Nhãn",
              "unitPrice": {
                "$numberInt": "49000"
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
                "$numberInt": "49000"
              },
              "isPrepared": false,
              "costTotal": null,
              "costPerItem": null,
              "costAllocations": []
            }
          ],
          "totalAmount": {
            "$numberInt": "49000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "49000"
          },
          "paymentMethod": "BANK_TRANSFER",
          "tableNumber": "T01",
          "orderNote": "1 x Trà Sen Vàng Long Nhãn (M): đường 50%, Đá chuẩn",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1794673152302"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674819863"
            }
          },
          "__v": {
            "$numberInt": "1"
          },
          "cancelReason": "f"
        },
        {
          "_id": {
            "$oid": "6af89066633d649bec85d385"
          },
          "orderCode": "AURA-MWGN16OP-A38244DD",
          "checkoutFlow": false,
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "0"
          },
          "orderType": "DINE_IN",
          "status": "CANCELLED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab956"
              },
              "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
              "unitPrice": {
                "$numberInt": "68000"
              },
              "customization": {
                "size": "Chai 250ml",
                "sugar": "50%",
                "ice": "Đá chuẩn"
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
          "paymentMethod": "BANK_TRANSFER",
          "tableNumber": "T01",
          "orderNote": "1 x Cold Brew Đóng Chai Aura Reserve (Chai 250ml): đường 50%, Đá chuẩn",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1794674790173"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674824339"
            }
          },
          "__v": {
            "$numberInt": "1"
          },
          "cancelReason": "f"
        },
        {
          "_id": {
            "$oid": "6af890ac633d649bec85d3b2"
          },
          "orderCode": "AURA-MWGN2OV5-E0395C5F",
          "checkoutFlow": false,
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
                "$oid": "6aeb673031b031ff6bfab957"
              },
              "productNameAtTime": "Cà Phê Sữa Đá Sài Gòn Nâu",
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
          "paymentMethod": "BANK_TRANSFER",
          "tableNumber": "T01",
          "orderNote": "1 x Cà Phê Sữa Đá Sài Gòn Nâu (M): đường 50%, Đá chuẩn",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794674860387"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794675053530"
            }
          },
          "__v": {
            "$numberInt": "5"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794675037095"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794675037095"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "orderCode": "AURA-MWGPYMLL-987C734A",
          "checkoutFlow": true,
          "checkoutSessionId": "ec49cf79-cadf-4af9-b978-c16a6ba6fb71",
          "idempotencyKey": "af359eae-7f91-4a85-b5eb-44e3ee2b1494",
          "requestHash": "f63f42723efa3857cc1436a2609796a27e6fcb99956897bc3403f7b3a940a2de",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "pointsRedeemed": {
            "$numberInt": "200"
          },
          "orderType": "ONLINE",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab954"
              },
              "productNameAtTime": "Cà Phê Muối Aura Đặc Biệt",
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
            "$numberInt": "40000"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "23000"
          },
          "paymentMethod": "BANK_TRANSFER",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "asdfsaas, adasfsdaf, Ba Đình, Hà Nội",
          "district": "Ba Đình",
          "ward": "adasfsdaf",
          "addressDetail": "asdfsaas",
          "delivery": {
            "history": [
              {
                "action": "ASSIGNED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794679823486"
                  }
                },
                "_id": {
                  "$oid": "6af8a40f1dc7407ccb05eadc"
                }
              },
              {
                "action": "ACCEPTED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794679823488"
                  }
                },
                "_id": {
                  "$oid": "6af8a40f1dc7407ccb05eadd"
                }
              },
              {
                "action": "DELIVERING",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794679844216"
                  }
                },
                "_id": {
                  "$oid": "6af8a4241dc7407ccb05eae4"
                }
              },
              {
                "action": "DELIVERED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794679846621"
                  }
                },
                "_id": {
                  "$oid": "6af8a4261dc7407ccb05eaee"
                }
              }
            ],
            "acceptedAt": {
              "$date": {
                "$numberLong": "1794679823488"
              }
            },
            "assignedAt": {
              "$date": {
                "$numberLong": "1794679823486"
              }
            },
            "status": "DELIVERED",
            "pickedUpAt": {
              "$date": {
                "$numberLong": "1794679844216"
              }
            },
            "deliveredAt": {
              "$date": {
                "$numberLong": "1794679846621"
              }
            }
          },
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679709679"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679846623"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "cartClearedAt": {
            "$date": {
              "$numberLong": "1794679737618"
            }
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794679796069"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794679796069"
            }
          },
          "shipper": {
            "$oid": "6af4b8350b44b941144fb48f"
          }
        },
        {
          "_id": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "orderCode": "AURA-MWGQ7DD8-E1A801F4",
          "checkoutFlow": false,
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "pointsRedeemed": {
            "$numberInt": "500"
          },
          "orderType": "DINE_IN",
          "status": "COMPLETED",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab956"
              },
              "productNameAtTime": "Cold Brew Đóng Chai Aura Reserve",
              "unitPrice": {
                "$numberInt": "68000"
              },
              "customization": {
                "size": "Chai 250ml",
                "sugar": "50%",
                "ice": "Đá chuẩn"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "68000"
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
                    "$numberInt": "30"
                  },
                  "unitCost": null
                }
              ]
            },
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab955"
              },
              "productNameAtTime": "Caramel Macchiato Đặc Sản",
              "unitPrice": {
                "$numberInt": "55000"
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
                    "$numberInt": "180"
                  },
                  "unitCost": null
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "123000"
          },
          "discountAmount": {
            "$numberInt": "100000"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "23000"
          },
          "paymentMethod": "BANK_TRANSFER",
          "delivery": {
            "history": []
          },
          "tableNumber": "T01",
          "inventoryProcessing": false,
          "costTotal": null,
          "costStatus": "MISSING_PRICE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794680117616"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680235510"
            }
          },
          "__v": {
            "$numberInt": "6"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794680224392"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794680224392"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8acccfcfef0a0c28d44fc"
          },
          "orderCode": "AURA-MWGRD0E9-D9741051",
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
                "$oid": "6aeb673031b031ff6bfab955"
              },
              "productNameAtTime": "Caramel Macchiato Đặc Sản",
              "unitPrice": {
                "$numberInt": "55000"
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
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": {
                "$numberInt": "17000"
              },
              "costPerItem": {
                "$numberInt": "17000"
              },
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6af8ab91fcfef0a0c28d41bb"
                  },
                  "ingredientName": "sữa ông thọ",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6af8ac66fcfef0a0c28d4363"
                  },
                  "quantity": {
                    "$numberInt": "200"
                  },
                  "unitCost": {
                    "$numberInt": "85"
                  }
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "55000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "55000"
          },
          "paymentMethod": "CASH",
          "delivery": {
            "history": []
          },
          "tableNumber": "T01",
          "inventoryProcessing": false,
          "costTotal": {
            "$numberInt": "17000"
          },
          "costStatus": "COMPLETE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682060359"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682526882"
            }
          },
          "__v": {
            "$numberInt": "5"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794682079466"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794682079466"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8af7edd892966174aa711"
          },
          "orderCode": "AURA-MWGRRT1V-0F105240",
          "checkoutFlow": true,
          "checkoutSessionId": "45ef198f-9334-4b82-a5da-bbb089b92f53",
          "idempotencyKey": "a262ba30-19c3-4c00-8d8b-2bf6d6ec7815",
          "requestHash": "f25ad1f4c284abc6bab4c75628ed76e1e9dd52419652b3a08b624e013e38169b",
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
                "$oid": "6aeb673031b031ff6bfab955"
              },
              "productNameAtTime": "Caramel Macchiato Đặc Sản",
              "unitPrice": {
                "$numberInt": "55000"
              },
              "customization": {
                "size": "M"
              },
              "quantity": {
                "$numberInt": "1"
              },
              "subtotal": {
                "$numberInt": "55000"
              },
              "isPrepared": true,
              "costTotal": {
                "$numberInt": "17000"
              },
              "costPerItem": {
                "$numberInt": "17000"
              },
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "6af8ab91fcfef0a0c28d41bb"
                  },
                  "ingredientName": "sữa ông thọ",
                  "unit": "ml",
                  "lotId": {
                    "$oid": "6af8ac66fcfef0a0c28d4363"
                  },
                  "quantity": {
                    "$numberInt": "200"
                  },
                  "unitCost": {
                    "$numberInt": "85"
                  }
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "55000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "18000"
          },
          "finalAmount": {
            "$numberInt": "73000"
          },
          "paymentMethod": "COD",
          "recipientName": "Le Minh Anh",
          "recipientPhone": "0900000004",
          "deliveryAddress": "adfasdfasdf, fadfasd, Ba Đình, Hà Nội",
          "district": "Ba Đình",
          "ward": "fadfasd",
          "addressDetail": "adfasdfasdf",
          "delivery": {
            "history": [
              {
                "action": "ASSIGNED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794682834015"
                  }
                },
                "_id": {
                  "$oid": "6af8afd2dd892966174aa7d1"
                }
              },
              {
                "action": "ACCEPTED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794682834017"
                  }
                },
                "_id": {
                  "$oid": "6af8afd2dd892966174aa7d2"
                }
              },
              {
                "action": "DELIVERING",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794682835310"
                  }
                },
                "_id": {
                  "$oid": "6af8afd3dd892966174aa7dd"
                }
              },
              {
                "action": "DELIVERED",
                "actor": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "shipper": {
                  "$oid": "6af4b8350b44b941144fb48f"
                },
                "at": {
                  "$date": {
                    "$numberLong": "1794682837935"
                  }
                },
                "_id": {
                  "$oid": "6af8afd5dd892966174aa7eb"
                }
              }
            ],
            "acceptedAt": {
              "$date": {
                "$numberLong": "1794682834017"
              }
            },
            "assignedAt": {
              "$date": {
                "$numberLong": "1794682834015"
              }
            },
            "status": "DELIVERED",
            "pickedUpAt": {
              "$date": {
                "$numberLong": "1794682835310"
              }
            },
            "deliveredAt": {
              "$date": {
                "$numberLong": "1794682837935"
              }
            }
          },
          "inventoryProcessing": false,
          "costTotal": {
            "$numberInt": "17000"
          },
          "costStatus": "COMPLETE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682750689"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682837936"
            }
          },
          "__v": {
            "$numberInt": "7"
          },
          "cartClearedAt": {
            "$date": {
              "$numberLong": "1794682758654"
            }
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1794682777682"
            }
          },
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1794682777682"
            }
          },
          "shipper": {
            "$oid": "6af4b8350b44b941144fb48f"
          }
        },
        {
          "_id": {
            "$oid": "df1640b1d2e2c9b927aaac60"
          },
          "orderCode": "AURA-DEMO-PREPARING",
          "customer": {
            "$oid": "6aeb673031b031ff6bfab946"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "tableNumber": "T02",
          "orderType": "DINE_IN",
          "status": "PREPARING",
          "items": [
            {
              "product": {
                "$oid": "6aeb673031b031ff6bfab959"
              },
              "productNameAtTime": "Bánh Croissant Bơ Pháp",
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
              "isPrepared": false,
              "costTotal": {
                "$numberInt": "18000"
              },
              "costPerItem": {
                "$numberInt": "18000"
              },
              "costAllocations": [
                {
                  "ingredient": {
                    "$oid": "058acaf05eed774b975fe1bc"
                  },
                  "ingredientName": "Bánh croissant thành phẩm",
                  "unit": "cái",
                  "lotId": {
                    "$oid": "81b835ff3d40d18822b382e9"
                  },
                  "quantity": {
                    "$numberInt": "1"
                  },
                  "unitCost": {
                    "$numberInt": "18000"
                  }
                }
              ]
            }
          ],
          "totalAmount": {
            "$numberInt": "35000"
          },
          "discountAmount": {
            "$numberInt": "0"
          },
          "deliveryFee": {
            "$numberInt": "0"
          },
          "finalAmount": {
            "$numberInt": "35000"
          },
          "paymentMethod": "CASH",
          "inventoryDeductedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "costTotal": {
            "$numberInt": "18000"
          },
          "costCapturedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "costStatus": "COMPLETE",
          "createdAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
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
        },
        {
          "key": {
            "sepayTransactionId": {
              "$numberInt": "1"
            }
          },
          "name": "sepayTransactionId_1",
          "unique": true,
          "sparse": true
        },
        {
          "key": {
            "transactionCode": {
              "$numberInt": "1"
            }
          },
          "name": "transactionCode_1",
          "unique": true,
          "partialFilterExpression": {
            "confirmationMode": "CASHIER",
            "paymentMethod": "BANK_TRANSFER",
            "transactionCode": {
              "$type": "string"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "0cda51a93a2e755cab87d5d6"
          },
          "order": {
            "$oid": "df1640b1d2e2c9b927aaac60"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "35000"
          },
          "status": "SUCCESS",
          "confirmationMode": "CASHIER",
          "paidAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "receivedAmount": {
            "$numberInt": "50000"
          },
          "changeAmount": {
            "$numberInt": "15000"
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795572000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "2536b570b82b0e2d4944608a"
          },
          "order": {
            "$oid": "3bcac1824571cc3df6b1ce56"
          },
          "paymentMethod": "BANK_TRANSFER",
          "amount": {
            "$numberInt": "63000"
          },
          "status": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795568400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "47b5f25246582e0f1f185d7c"
          },
          "order": {
            "$oid": "17dd10ba0c54b2d76f32116f"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "53000"
          },
          "status": "PENDING",
          "createdAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795575600000"
            }
          }
        },
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
        },
        {
          "_id": {
            "$oid": "6af88a00633d649bec85d30b"
          },
          "order": {
            "$oid": "6af88a00633d649bec85d309"
          },
          "paymentMethod": "BANK_TRANSFER",
          "transactionCode": "QR-16C192BE356294FC29CEB334",
          "amount": {
            "$numberInt": "49000"
          },
          "status": "FAILED",
          "paymentNote": "Thanh toán tại quầy",
          "createdAt": {
            "$date": {
              "$numberLong": "1794673152321"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674819900"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af89066633d649bec85d387"
          },
          "order": {
            "$oid": "6af89066633d649bec85d385"
          },
          "paymentMethod": "BANK_TRANSFER",
          "transactionCode": "QR-A3214A7A5A77502A990B555D",
          "amount": {
            "$numberInt": "68000"
          },
          "status": "FAILED",
          "paymentNote": "Thanh toán tại quầy",
          "createdAt": {
            "$date": {
              "$numberLong": "1794674790181"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674824342"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af890ac633d649bec85d3b4"
          },
          "order": {
            "$oid": "6af890ac633d649bec85d3b2"
          },
          "paymentMethod": "BANK_TRANSFER",
          "transactionCode": "QR-D08757B50162C848EADA6B1B",
          "amount": {
            "$numberInt": "39000"
          },
          "status": "SUCCESS",
          "paymentNote": "SePay xác nhận tiền vào tài khoản ngân hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794674860393"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794674927063"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794674927062"
            }
          },
          "sepayTransactionId": "99498437"
        },
        {
          "_id": {
            "$oid": "6af8a39d1dc7407ccb05eaa4"
          },
          "order": {
            "$oid": "6af8a39d1dc7407ccb05eaa2"
          },
          "paymentMethod": "BANK_TRANSFER",
          "transactionCode": "QR-A07A61F1A8AE069920E01A9F",
          "confirmationMode": "GATEWAY",
          "amount": {
            "$numberInt": "23000"
          },
          "status": "SUCCESS",
          "paymentNote": "SePay xác nhận tiền vào tài khoản ngân hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679709689"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679737585"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794679737585"
            }
          },
          "sepayTransactionId": "99512052"
        },
        {
          "_id": {
            "$oid": "6af8a5351dc7407ccb05eca4"
          },
          "order": {
            "$oid": "6af8a5351dc7407ccb05eca1"
          },
          "paymentMethod": "BANK_TRANSFER",
          "transactionCode": "QR-0151102B52EFC6DC23DE9578",
          "confirmationMode": "GATEWAY",
          "amount": {
            "$numberInt": "23000"
          },
          "status": "SUCCESS",
          "paymentNote": "SePay xác nhận tiền vào tài khoản ngân hàng",
          "createdAt": {
            "$date": {
              "$numberLong": "1794680117627"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794680140260"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794680140259"
            }
          },
          "sepayTransactionId": "99512518"
        },
        {
          "_id": {
            "$oid": "6af8acccfcfef0a0c28d44fe"
          },
          "order": {
            "$oid": "6af8acccfcfef0a0c28d44fc"
          },
          "paymentMethod": "CASH",
          "amount": {
            "$numberInt": "55000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu ngân Tran Thi Binh xác nhận đã nhận tiền mặt tại quầy",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682060365"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682063668"
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
              "$numberLong": "1794682063668"
            }
          },
          "receivedAmount": {
            "$numberInt": "55000"
          },
          "receivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          }
        },
        {
          "_id": {
            "$oid": "6af8af7edd892966174aa713"
          },
          "order": {
            "$oid": "6af8af7edd892966174aa711"
          },
          "paymentMethod": "CASH",
          "transactionCode": "COD-AURA-MWGRRT1V-0F105240",
          "confirmationMode": "GATEWAY",
          "amount": {
            "$numberInt": "73000"
          },
          "status": "SUCCESS",
          "paymentNote": "Thu tiền COD khi giao hàng hoàn tất",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682750701"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682866160"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "paidAt": {
            "$date": {
              "$numberLong": "1794682837939"
            }
          },
          "receivedBy": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "remittanceId": "c68b88d5-9c5e-4596-ad21-75681eb42afb",
          "remittanceSchedule": {
            "$oid": "6af8a3251dc7407ccb05ea55"
          },
          "remittedAt": {
            "$date": {
              "$numberLong": "1794682866144"
            }
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
            "$oid": "16cae12d76f54bc21e5f4c9e"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95e"
          },
          "ingredient": {
            "$oid": "3661198b623f59b138dc83e6"
          },
          "quantityRequired": {
            "$numberInt": "5"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "2aa75f0b49e18886d491fccc"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95e"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantityRequired": {
            "$numberInt": "120"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
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
              "$numberLong": "1794681245124"
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
              "$numberLong": "1794681245124"
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
            "$numberInt": "50"
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
              "$numberLong": "1794680442887"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a5e11e5896fafbd24c18"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab966"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794680289240"
            }
          },
          "quantityRequired": {
            "$numberInt": "300"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686639191"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8ac971e5896fafbd24c19"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab955"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794682007047"
            }
          },
          "quantityRequired": {
            "$numberInt": "200"
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682007047"
            }
          }
        },
        {
          "_id": {
            "$oid": "8e373af91accf83b4d4be16a"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab959"
          },
          "ingredient": {
            "$oid": "058acaf05eed774b975fe1bc"
          },
          "quantityRequired": {
            "$numberInt": "1"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "94a4894c9177c3f7d8e6d1aa"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95a"
          },
          "ingredient": {
            "$oid": "fadf568441a051bcd8a1ee84"
          },
          "quantityRequired": {
            "$numberInt": "8"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "e2333a7d3343d52b5227fccf"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95e"
          },
          "ingredient": {
            "$oid": "6cbbe4ef97fbd0710a9f6373"
          },
          "quantityRequired": {
            "$numberInt": "25"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "fb8ae182627a05e6b7806d2d"
          },
          "product": {
            "$oid": "6aeb673031b031ff6bfab95a"
          },
          "ingredient": {
            "$oid": "6aeb673031b031ff6bfab964"
          },
          "quantityRequired": {
            "$numberInt": "150"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        }
      ]
    },
    {
      "name": "products",
      "indexes": [
        {
          "key": {
            "nameKey": {
              "$numberInt": "1"
            }
          },
          "name": "nameKey_1",
          "unique": true,
          "partialFilterExpression": {
            "nameKey": {
              "$type": "string"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab954"
          },
          "category": {
            "$oid": "6aeb673031b031ff6bfab94f"
          },
          "name": "Cà Phê Muối Aura Đặc Biệt",
          "basePrice": {
            "$numberInt": "45000"
          },
          "badge": "BÁN CHẠY",
          "subtitle": "Phin Cổ Điển",
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
                "name": "Extra kem muối",
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
          "description": "Fine Robusta ủ phin truyền thống phối kem sữa mằn mặn béo ngậy, cân bằng hậu vị ngọt đầm.",
          "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab966"
              },
              "quantityRequired": {
                "$numberInt": "300"
              },
              "_id": {
                "$oid": "6af8beafca596a60e19a9542"
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
              "$numberLong": "1794686639265"
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
          "name": "Caramel Macchiato Đặc Sản",
          "basePrice": {
            "$numberInt": "55000"
          },
          "badge": "BÁN CHẠY",
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
                "name": "Sốt caramel thêm",
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
          "description": "Lớp sữa tươi nóng thanh dịu, quyện cùng espresso kép Arabica Cầu Đất đậm đà và vân sốt caramel thơm lừng.",
          "imageUrl": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6af8ab91fcfef0a0c28d41bb"
              },
              "quantityRequired": {
                "$numberInt": "200"
              },
              "_id": {
                "$oid": "6af8ac97fcfef0a0c28d43fe"
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
              "$numberLong": "1794682007095"
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
          "name": "Cold Brew Đóng Chai Aura Reserve",
          "basePrice": {
            "$numberInt": "68000"
          },
          "badge": "BÁN CHẠY",
          "subtitle": "Ủ Lạnh 16 Tiếng",
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
          "description": "Chiết xuất lạnh 16 tiếng từ 100% Arabica Bourbon, hương hoa quả nhiệt đới tươi mát, giữ trọn vị nguyên bản.",
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
          "name": "Cà Phê Sữa Đá Sài Gòn Nâu",
          "basePrice": {
            "$numberInt": "39000"
          },
          "subtitle": "Đậm Vị Phin",
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
                "name": "Thạch cà phê",
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
          "description": "Hạt Fine Robusta rang nâu bóng mượt, chiết xuất phin chậm kết hợp sữa đặc ngọt êm béo ngậy truyền thống.",
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
                "$oid": "6af8a99d1dc7407ccb05f55d"
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
                "$oid": "6af8a99d1dc7407ccb05f55e"
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
              "$numberLong": "1794681245142"
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
          "name": "Trà Đào Cam Sả Tươi",
          "basePrice": {
            "$numberInt": "45000"
          },
          "badge": "MÓN MỚI",
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
                "name": "Thạch đào giòn",
                "price": {
                  "$numberInt": "8000"
                }
              },
              {
                "name": "Hạt chia",
                "price": {
                  "$numberInt": "5000"
                }
              }
            ]
          },
          "description": "Nước cốt trà đen Ceylon thanh dịu kết hợp miếng đào giòn ngọt mọng nước cùng sả tươi ấm nồng.",
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
          "name": "Bánh Croissant Bơ Pháp",
          "basePrice": {
            "$numberInt": "35000"
          },
          "badge": "BÁN CHẠY",
          "subtitle": "Bơ Elle & Vire",
          "variantsConfig": {
            "sizes": {
              "Tiêu chuẩn": {
                "$numberInt": "0"
              }
            },
            "toppings": [
              {
                "name": "Mứt dâu tây",
                "price": {
                  "$numberInt": "6000"
                }
              },
              {
                "name": "Sốt sôcôla",
                "price": {
                  "$numberInt": "6000"
                }
              }
            ]
          },
          "description": "Bột ngàn lớp thủ công giòn rụm bên ngoài, mềm xốp ngậy hương bơ Elle & Vire hảo hạng bên trong.",
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
          "name": "Matcha Latte Uji Kyoto Đá Xay",
          "basePrice": {
            "$numberInt": "58000"
          },
          "badge": "BÁN CHẠY",
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
                "name": "Thạch matcha",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Bột trà xanh Uji trứ danh cố đô Kyoto xay cùng sữa hạt và kem whipping bông xốp béo mịn thượng hạng.",
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
          "name": "Trà Sen Vàng Long Nhãn",
          "basePrice": {
            "$numberInt": "49000"
          },
          "subtitle": "Trà Đen Ceylon",
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
                "name": "Hạt sen thêm",
                "price": {
                  "$numberInt": "10000"
                }
              },
              {
                "name": "Củ năng giòn",
                "price": {
                  "$numberInt": "8000"
                }
              }
            ]
          },
          "description": "Hạt sen Huế ninh mềm dẻo, nhãn nhục ngọt thanh quyện cùng trà ô long hảo hạng và lớp kem củ năng giòn.",
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
          "name": "Americano Đá Rang Đậm",
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
          "description": "Espresso kép chiết xuất áp suất cao từ hạt cà phê đặc sản, vị chua thanh thanh tao và hậu ngọt dài lâu.",
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
          "name": "Latte Nghệ Thuật Hạt Phỉ",
          "basePrice": {
            "$numberInt": "52000"
          },
          "badge": "MÓN MỚI",
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
                "name": "Siro hạt phỉ",
                "price": {
                  "$numberInt": "6000"
                }
              },
              {
                "name": "Sữa yến mạch (Oat milk)",
                "price": {
                  "$numberInt": "12000"
                }
              }
            ]
          },
          "description": "Hòa quyện tinh tế giữa espresso thơm ngát, sữa tươi đánh bọt mịn màng và siro hạt phỉ thơm lừng.",
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
          "name": "Sôcôla Bỉ Đá Xay Hạnh Nhân",
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
                "name": "Hạnh nhân vụn",
                "price": {
                  "$numberInt": "6000"
                }
              }
            ]
          },
          "description": "Bột cacao nguyên chất nhập khẩu Bỉ xay nhuyễn cùng sữa đặc, rắc hạnh nhân nướng giòn tan.",
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
          "name": "Bánh Cheesecake Việt Quất",
          "basePrice": {
            "$numberInt": "55000"
          },
          "badge": "BÁN CHẠY",
          "subtitle": "New York Style",
          "variantsConfig": {
            "sizes": {
              "1 Phần": {
                "$numberInt": "0"
              }
            },
            "toppings": []
          },
          "description": "Cream cheese Philadelphia béo ngậy kết hợp mứt việt quất chua ngọt dịu và đế bánh quy nướng thơm lừng.",
          "imageUrl": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
          "isAvailable": true,
          "recipe": [
            {
              "ingredient": {
                "$oid": "6aeb673031b031ff6bfab968"
              },
              "quantityRequired": {
                "$numberInt": "50"
              },
              "_id": {
                "$oid": "6af8a67a1dc7407ccb05f051"
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
              "$numberLong": "1794680442910"
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
            "$oid": "0b3baa34ca065bc32c9b4dcc"
          },
          "purchaseOrder": {
            "$oid": "9f712f3793cd68b4abd25fec"
          },
          "ingredient": {
            "$oid": "4990da8f82da567423a05687"
          },
          "quantity": {
            "$numberInt": "1000"
          },
          "unitPrice": {
            "$numberInt": "65"
          },
          "totalCost": {
            "$numberInt": "65000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795316400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795316400000"
            }
          }
        },
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
              "$numberLong": "1794681278586"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "totalCost": {
            "$numberInt": "2000000"
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
              "$numberLong": "1794681304201"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "totalCost": {
            "$numberInt": "1500000"
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
            "$numberInt": "250"
          },
          "totalCost": {
            "$numberInt": "250000"
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
              "$numberLong": "1794680505292"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8ac57fcfef0a0c28d4362"
          },
          "purchaseOrder": {
            "$oid": "6af8ac57fcfef0a0c28d4361"
          },
          "ingredient": {
            "$oid": "6af8ab91fcfef0a0c28d41bb"
          },
          "quantity": {
            "$numberInt": "20000"
          },
          "unitPrice": {
            "$numberInt": "85"
          },
          "totalCost": {
            "$numberInt": "1700000"
          },
          "__v": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794681943290"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681943290"
            }
          }
        },
        {
          "_id": {
            "$oid": "f24c9586c7d8d0d6ebdf6d7e"
          },
          "purchaseOrder": {
            "$oid": "def42b01c142efddb5f0379f"
          },
          "ingredient": {
            "$oid": "f6b67060d00c497af05d4e85"
          },
          "quantity": {
            "$numberInt": "2000"
          },
          "unitPrice": {
            "$numberInt": "480"
          },
          "totalCost": {
            "$numberInt": "960000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1795489200000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795489200000"
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
              },
              "totalCost": {
                "$numberInt": "2000000"
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
              "$numberLong": "1794681278577"
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
            "$numberInt": "2100000"
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
              },
              "totalCost": {
                "$numberInt": "1500000"
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
              "$numberLong": "1794681304195"
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
            "$numberInt": "250000"
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
                "$numberInt": "250"
              },
              "totalCost": {
                "$numberInt": "250000"
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
              "$numberLong": "1794680505277"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8ac57fcfef0a0c28d4361"
          },
          "supplier": {
            "$oid": "6af8aa381dc7407ccb05f828"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "totalCost": {
            "$numberInt": "1700000"
          },
          "status": "RECEIVED",
          "note": "",
          "items": [
            {
              "ingredient": {
                "$oid": "6af8ab91fcfef0a0c28d41bb"
              },
              "quantity": {
                "$numberInt": "20000"
              },
              "unitPrice": {
                "$numberInt": "85"
              },
              "totalCost": {
                "$numberInt": "1700000"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1794681943274"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681958162"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "9f712f3793cd68b4abd25fec"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "status": "CANCELLED",
          "totalCost": {
            "$numberInt": "65000"
          },
          "items": [
            {
              "ingredient": {
                "$oid": "4990da8f82da567423a05687"
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "unitPrice": {
                "$numberInt": "65"
              },
              "totalCost": {
                "$numberInt": "65000"
              }
            }
          ],
          "note": "Phiếu đã hủy demo",
          "createdAt": {
            "$date": {
              "$numberLong": "1795316400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795316400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "def42b01c142efddb5f0379f"
          },
          "supplier": {
            "$oid": "6aeb673031b031ff6bfab960"
          },
          "creator": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "status": "DRAFT",
          "totalCost": {
            "$numberInt": "960000"
          },
          "items": [
            {
              "ingredient": {
                "$oid": "f6b67060d00c497af05d4e85"
              },
              "quantity": {
                "$numberInt": "2000"
              },
              "unitPrice": {
                "$numberInt": "480"
              },
              "totalCost": {
                "$numberInt": "960000"
              }
            }
          ],
          "note": "Phiếu nháp demo",
          "createdAt": {
            "$date": {
              "$numberLong": "1795489200000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795489200000"
            }
          }
        }
      ]
    },
    {
      "name": "restockrequests",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "012e5ea7f237ccea1241efe4"
          },
          "requester": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "reviewer": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "reviewedAt": {
            "$date": {
              "$numberLong": "1795406400000"
            }
          },
          "reviewNote": "Điều chỉnh số lượng rồi gửi lại",
          "status": "REJECTED",
          "reason": "Đề xuất số lượng lớn",
          "note": "Dữ liệu demo",
          "items": [
            {
              "_id": {
                "$oid": "6fc3e44a1f374a5fb35671c7"
              },
              "ingredient": {
                "$oid": "f6b67060d00c497af05d4e85"
              },
              "quantity": {
                "$numberInt": "5000"
              },
              "itemNote": ""
            }
          ],
          "history": [
            {
              "_id": {
                "$oid": "b991bcee22af091f56bdebfa"
              },
              "action": "create",
              "actor": {
                "$oid": "ddb1643cf10b2c39c11d7488"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795399200000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "59b27ed76eafdf7a0598a9ba"
              },
              "action": "submit",
              "actor": {
                "$oid": "ddb1643cf10b2c39c11d7488"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795402800000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "259c04b2758530efe76e9b95"
              },
              "action": "reject",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab943"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795406400000"
                }
              },
              "note": "Điều chỉnh số lượng rồi gửi lại"
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1795399200000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795406400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6331d99a4ddb70bfbb2db217"
          },
          "requester": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "status": "DRAFT",
          "reason": "Đường nâu dưới mức tồn tối thiểu",
          "note": "Dữ liệu demo",
          "items": [
            {
              "_id": {
                "$oid": "934fbf8b34fcff7714eb091f"
              },
              "ingredient": {
                "$oid": "4990da8f82da567423a05687"
              },
              "quantity": {
                "$numberInt": "3000"
              },
              "itemNote": ""
            }
          ],
          "history": [
            {
              "_id": {
                "$oid": "b96a1e6076ffc5215f33c66f"
              },
              "action": "create",
              "actor": {
                "$oid": "ddb1643cf10b2c39c11d7488"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795140000000"
                }
              },
              "note": ""
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1795140000000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795140000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "7491f4979dbf84c38f863553"
          },
          "requester": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "status": "CANCELLED",
          "reason": "Đề xuất trùng",
          "note": "Dữ liệu demo",
          "items": [
            {
              "_id": {
                "$oid": "c9ca5df2318fd97a2fded3b9"
              },
              "ingredient": {
                "$oid": "4990da8f82da567423a05687"
              },
              "quantity": {
                "$numberInt": "500"
              },
              "itemNote": ""
            }
          ],
          "history": [
            {
              "_id": {
                "$oid": "688abe6c10f6e42181c0f201"
              },
              "action": "create",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795485600000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "5fba8749b7026a51b69d9f6e"
              },
              "action": "cancel",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795489200000"
                }
              },
              "note": ""
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1795485600000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795489200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "87c55f14f2cfa4c927b12b2b"
          },
          "requester": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "reviewer": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "reviewedAt": {
            "$date": {
              "$numberLong": "1795320000000"
            }
          },
          "reviewNote": "Đồng ý nhập bổ sung",
          "status": "APPROVED",
          "reason": "Bổ sung đường nâu",
          "note": "Dữ liệu demo",
          "items": [
            {
              "_id": {
                "$oid": "d6f3ca523bb3d246823d344c"
              },
              "ingredient": {
                "$oid": "4990da8f82da567423a05687"
              },
              "quantity": {
                "$numberInt": "1000"
              },
              "itemNote": ""
            }
          ],
          "history": [
            {
              "_id": {
                "$oid": "c60144f37cd36ec4effe2a0e"
              },
              "action": "create",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795312800000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "2b3dd77a1520affdf7d19b8e"
              },
              "action": "submit",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795316400000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "1169b883a7c35c0ace746b42"
              },
              "action": "approve",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab943"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795320000000"
                }
              },
              "note": ""
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1795312800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795320000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "a1dd0663417a3d25c5570887"
          },
          "requester": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "status": "PENDING_APPROVAL",
          "reason": "Cần hạt Arabica cho các ca cuối tuần",
          "note": "Dữ liệu demo",
          "items": [
            {
              "_id": {
                "$oid": "b411cf553d548a2b30eae5e1"
              },
              "ingredient": {
                "$oid": "f6b67060d00c497af05d4e85"
              },
              "quantity": {
                "$numberInt": "2000"
              },
              "itemNote": ""
            }
          ],
          "history": [
            {
              "_id": {
                "$oid": "8a7f2ae89f11cb07c22b2c97"
              },
              "action": "create",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795226400000"
                }
              },
              "note": ""
            },
            {
              "_id": {
                "$oid": "03cf3c7e2c0a986062ecfe8d"
              },
              "action": "submit",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1795230000000"
                }
              },
              "note": ""
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1795226400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795230000000"
            }
          }
        }
      ]
    },
    {
      "name": "rewarditems",
      "indexes": [],
      "documents": [
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab9b5"
          },
          "name": "Giảm 15.000đ bằng điểm",
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
          "name": "Giảm 30.000đ bằng điểm",
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
          "name": "Giảm 50.000đ bằng điểm",
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
          "name": "Giảm 100.000đ bằng điểm",
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
      "documents": [
        {
          "_id": {
            "$oid": "0ee80c0cb92b6b27a2fe4af9"
          },
          "schedule": {
            "$oid": "459337a74ba3995ed5eb7584"
          },
          "cashier": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca tối",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794902280000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794929700000"
            }
          },
          "openingCash": {
            "$numberInt": "100000"
          },
          "cashSales": {
            "$numberInt": "0"
          },
          "codReceipts": {
            "$numberInt": "0"
          },
          "cashRefunds": {
            "$numberInt": "0"
          },
          "expectedCash": {
            "$numberInt": "100000"
          },
          "actualCash": {
            "$numberInt": "90000"
          },
          "difference": {
            "$numberInt": "-10000"
          },
          "note": "Két thiếu 10.000đ, cần kiểm tra lại.",
          "status": "REJECTED",
          "reviewedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "reviewedAt": {
            "$date": {
              "$numberLong": "1794933900000"
            }
          },
          "reviewerNote": "Kiểm đếm và gửi lại biên bản.",
          "revision": {
            "$numberInt": "0"
          },
          "history": [
            {
              "_id": {
                "$oid": "165a5392c021c72a358ff738"
              },
              "action": "REJECT",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab943"
              },
              "at": {
                "$date": {
                  "$numberLong": "1794933900000"
                }
              },
              "fromStatus": "SUBMITTED",
              "toStatus": "REJECTED",
              "note": "Kiểm đếm và gửi lại biên bản.",
              "actualCash": {
                "$numberInt": "90000"
              },
              "expectedCash": {
                "$numberInt": "100000"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1794930300000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794933900000"
            }
          }
        },
        {
          "_id": {
            "$oid": "2380ae60e278de43103ffcec"
          },
          "schedule": {
            "$oid": "278a219a4b255aaf5362fd18"
          },
          "cashier": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca sáng",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794873720000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794902280000"
            }
          },
          "openingCash": {
            "$numberInt": "100000"
          },
          "cashSales": {
            "$numberInt": "0"
          },
          "codReceipts": {
            "$numberInt": "0"
          },
          "cashRefunds": {
            "$numberInt": "0"
          },
          "expectedCash": {
            "$numberInt": "100000"
          },
          "actualCash": {
            "$numberInt": "100000"
          },
          "difference": {
            "$numberInt": "0"
          },
          "note": "",
          "status": "CONFIRMED",
          "reviewedBy": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "reviewedAt": {
            "$date": {
              "$numberLong": "1794906480000"
            }
          },
          "reviewerNote": "Số liệu đã khớp.",
          "revision": {
            "$numberInt": "0"
          },
          "history": [
            {
              "_id": {
                "$oid": "c2d7fdbb7e4d36a6985eee91"
              },
              "action": "CONFIRM",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab943"
              },
              "at": {
                "$date": {
                  "$numberLong": "1794906480000"
                }
              },
              "fromStatus": "SUBMITTED",
              "toStatus": "CONFIRMED",
              "note": "Số liệu đã khớp.",
              "actualCash": {
                "$numberInt": "100000"
              },
              "expectedCash": {
                "$numberInt": "100000"
              }
            }
          ],
          "createdAt": {
            "$date": {
              "$numberLong": "1794902880000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794906480000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af897bf1e5896fafbd24c17"
          },
          "schedule": {
            "$oid": "6af88881633d649bec85d1f7"
          },
          "__v": {
            "$numberInt": "0"
          },
          "actualCash": {
            "$numberInt": "0"
          },
          "cashRefunds": {
            "$numberInt": "0"
          },
          "cashSales": {
            "$numberInt": "0"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794672777438"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794675540000"
            }
          },
          "codReceipts": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794676671486"
            }
          },
          "difference": {
            "$numberInt": "0"
          },
          "expectedCash": {
            "$numberInt": "0"
          },
          "history": [
            {
              "action": "SUBMIT",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1794676671486"
                }
              },
              "toStatus": "SUBMITTED",
              "note": "",
              "actualCash": {
                "$numberInt": "0"
              },
              "expectedCash": {
                "$numberInt": "0"
              },
              "_id": {
                "$oid": "6af897bf795c33ec4f960971"
              }
            }
          ],
          "note": "",
          "openingCash": {
            "$numberInt": "0"
          },
          "revision": {
            "$numberInt": "0"
          },
          "shiftName": "ca 3",
          "status": "SUBMITTED",
          "updatedAt": {
            "$date": {
              "$numberLong": "1794676671486"
            }
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794614400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8b3a21e5896fafbd24c1e"
          },
          "schedule": {
            "$oid": "6af8a32d1dc7407ccb05ea57"
          },
          "__v": {
            "$numberInt": "0"
          },
          "actualCash": {
            "$numberInt": "228000"
          },
          "cashRefunds": {
            "$numberInt": "0"
          },
          "cashSales": {
            "$numberInt": "55000"
          },
          "cashier": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794679637054"
            }
          },
          "codReceipts": {
            "$numberInt": "73000"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1794683810984"
            }
          },
          "difference": {
            "$numberInt": "0"
          },
          "expectedCash": {
            "$numberInt": "228000"
          },
          "history": [
            {
              "action": "SUBMIT",
              "actor": {
                "$oid": "6aeb673031b031ff6bfab945"
              },
              "at": {
                "$date": {
                  "$numberLong": "1794683810984"
                }
              },
              "toStatus": "SUBMITTED",
              "note": "",
              "actualCash": {
                "$numberInt": "228000"
              },
              "expectedCash": {
                "$numberInt": "228000"
              },
              "_id": {
                "$oid": "6af8b3a2968e0a282c86a677"
              }
            }
          ],
          "note": "",
          "openingCash": {
            "$numberInt": "100000"
          },
          "revision": {
            "$numberInt": "0"
          },
          "shiftName": "ca 1",
          "status": "SUBMITTED",
          "updatedAt": {
            "$date": {
              "$numberLong": "1794683810984"
            }
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794700800000"
            }
          }
        }
      ]
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
          "settingValue": "Aura Café",
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
          "settingValue": "28 Tràng Tiền, Hoàn Kiếm, Hà Nội",
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
            "$oid": "45dda2f5a083bf40286691a1"
          },
          "name": "Nhà cung cấp cũ (demo)",
          "phone": "02838220000",
          "address": "Quận 1, TP. Hồ Chí Minh",
          "status": "INACTIVE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794272400000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795136400000"
            }
          }
        },
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
        },
        {
          "_id": {
            "$oid": "6af8aa381dc7407ccb05f828"
          },
          "name": "vinamilk",
          "phone": "0334444333",
          "address": "dsfddddd",
          "status": "ACTIVE",
          "createdAt": {
            "$date": {
              "$numberLong": "1794681400458"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794681400458"
            }
          },
          "__v": {
            "$numberInt": "0"
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
            "$oid": "52dd16476071582cd2208939"
          },
          "fullName": "Nguyễn Hữu Phúc",
          "phone": "0987000106",
          "email": "aura.shipper.phuc.demo@gmail.com",
          "emailKey": "aura.shipper.phuc.demo@gmail.com",
          "role": "STAFF",
          "position": "SHIPPER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7000000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab943"
          },
          "fullName": "Aura Admin",
          "phone": "0900000001",
          "email": "admin@auracafe.vn",
          "address": "28 Tràng Tiền, Hoàn Kiếm, Hà Nội",
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
          "address": "Đống Đa, Hà Nội",
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
          "address": "Cầu Giấy, Hà Nội",
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
          "address": "Hoàn Kiếm, Hà Nội",
          "role": "CUSTOMER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "0"
          },
          "hireDate": null,
          "totalPoints": {
            "$numberInt": "597"
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
              "$numberLong": "1794682837959"
            }
          },
          "checkoutRevision": {
            "$numberInt": "2"
          }
        },
        {
          "_id": {
            "$oid": "6aeb673031b031ff6bfab947"
          },
          "fullName": "Pham Quang Huy",
          "phone": "0900000005",
          "email": "huy@gmail.com",
          "address": "Cầu Giấy, Hà Nội",
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
          "address": "Ba Đình, Hà Nội",
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
        },
        {
          "_id": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "fullName": "Ngọc Phương Anh",
          "phone": "099898989",
          "email": "ngocthungan@gmail.com",
          "checkoutRevision": {
            "$numberInt": "0"
          },
          "role": "STAFF",
          "status": "ACTIVE",
          "position": "CASHIER",
          "baseSalary": {
            "$numberInt": "3000000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1794614400000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "emailKey": "ngocthungan@gmail.com",
          "createdAt": {
            "$date": {
              "$numberLong": "1794682266154"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682266154"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "fullName": "Trần Đức Long",
          "phone": "0987000105",
          "email": "aura.shipper.long.demo@gmail.com",
          "emailKey": "aura.shipper.long.demo@gmail.com",
          "role": "STAFF",
          "position": "SHIPPER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7000000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "fullName": "Đỗ Khánh Linh",
          "phone": "0987000104",
          "email": "aura.barista.linh.demo@gmail.com",
          "emailKey": "aura.barista.linh.demo@gmail.com",
          "role": "STAFF",
          "position": "BARISTA",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7600000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "fullName": "Võ Hồng Sơn",
          "phone": "0987000103",
          "email": "aura.barista.son.demo@gmail.com",
          "emailKey": "aura.barista.son.demo@gmail.com",
          "role": "STAFF",
          "position": "BARISTA",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7600000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "fullName": "Lê Thu Hà",
          "phone": "0987000101",
          "email": "aura.cashier.ha.demo@gmail.com",
          "emailKey": "aura.cashier.ha.demo@gmail.com",
          "role": "STAFF",
          "position": "CASHIER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7200000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "fullName": "Phạm Minh Châu",
          "phone": "0987000102",
          "email": "aura.cashier.chau.demo@gmail.com",
          "emailKey": "aura.cashier.chau.demo@gmail.com",
          "role": "STAFF",
          "position": "CASHIER",
          "status": "ACTIVE",
          "baseSalary": {
            "$numberInt": "7200000"
          },
          "hireDate": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "totalPoints": {
            "$numberInt": "0"
          },
          "createdAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1790812800000"
            }
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
        },
        {
          "key": {
            "cashTransferFrom": {
              "$numberInt": "1"
            }
          },
          "name": "cashTransferFrom_1",
          "unique": true,
          "partialFilterExpression": {
            "cashTransferFrom": {
              "$type": "objectId"
            }
          }
        },
        {
          "key": {
            "cashTransferTo": {
              "$numberInt": "1"
            }
          },
          "name": "cashTransferTo_1",
          "unique": true,
          "partialFilterExpression": {
            "cashTransferTo": {
              "$type": "objectId"
            }
          }
        }
      ],
      "documents": [
        {
          "_id": {
            "$oid": "02458619af6caa31cbb2080d"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794988920000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795015680000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795015800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "0340cbfa7e34a3b9d3dc4d14"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "058ff600dc6cc4d363cb653b"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "06a7e2affac2136b6cf87f61"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795392120000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795420680000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795420800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "0a992d821edc7f7b43fe7ec1"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795046460000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795075200000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795075200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "0c6f669ed73716a3b2ffc195"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "18123e3aa2c8a127669d1ee4"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795075080000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795102500000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795102200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "1954d2291307c444a34db92b"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795507080000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795534500000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795534200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "1eef2d5928bf2f2ab43d8a3a"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794959760000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794988980000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794988800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "1f8ae2977a233392b86a0c53"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795075320000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795102080000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795102200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "2097ae1efd85bc160d8848ea"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "20a5c151cdcbf172c61cd2da"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794816060000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794843000000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794843000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "21046d7fd3698d68982f5e24"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795334460000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795361400000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795361400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "22c842e8dc0b0ec96aaa699e"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795247880000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795275300000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795275000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "278a219a4b255aaf5362fd18"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794873720000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794902280000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794902400000"
            }
          },
          "startingCash": {
            "$numberInt": "100000"
          },
          "endingCashSystem": {
            "$numberInt": "100000"
          },
          "endingCashActual": {
            "$numberInt": "100000"
          },
          "handoverAt": {
            "$date": {
              "$numberLong": "1794902880000"
            }
          },
          "handoverNote": ""
        },
        {
          "_id": {
            "$oid": "27fa5b05da5c6cc7dd820ead"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795132920000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795161480000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795161600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "2e75321bbff27371c4fcfcb0"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795161480000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795188900000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795188600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "2f9a3bad23edf2b579351baf"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "303b78526c010da4c88c1ccf"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "33feca7d5a6fa8ccf70e49c9"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "38c5858c972482baae5cc729"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795478160000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795507380000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795507200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "3b4b8c0056f4980413622b7d"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "3ea2d445b49f6d3d258d8bd9"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794786960000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794816180000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794816000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "3f089c59be2cb15f07540c28"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795219260000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795248000000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795248000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "40edbbe3dd64914da2162f20"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795161660000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795188600000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795188600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "4387112f42257fb001dae247"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "459337a74ba3995ed5eb7584"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794902280000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794929700000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794929400000"
            }
          },
          "startingCash": {
            "$numberInt": "100000"
          },
          "endingCashSystem": {
            "$numberInt": "100000"
          },
          "endingCashActual": {
            "$numberInt": "90000"
          },
          "handoverAt": {
            "$date": {
              "$numberLong": "1794930300000"
            }
          },
          "handoverNote": "Két thiếu 10.000đ, cần kiểm tra lại."
        },
        {
          "_id": {
            "$oid": "484760acd5171de4f5c0ad06"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795248060000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795275000000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795275000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "485fb885f40952f04931867e"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795161720000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795188480000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795188600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "49ee175deb03f3c141798c1b"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795046160000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795075380000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795075200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "4a3c7fac7ac0ce72605c48c1"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "4f65ae000939af1c291a3da9"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795420560000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795447980000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795447800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "553f3494e83dce084176cc31"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795391760000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795420980000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795420800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "579c80b139c6f118c2271597"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "58d2ee76e2eb1ff837f4c7f7"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795507320000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795534080000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795534200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "5a57e467d1b9c5e55d7bbe13"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795305660000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795334400000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795334400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "5f00d5dfec76eed9cffe0319"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "6310bea43d75825ff99f01dc"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "655ae6bdef3c3b6fa6f4fc9a"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "65ae0317044ac674bb588e0f"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795074960000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795102380000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795102200000"
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
              "$numberLong": "1794673324261"
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
          },
          "shiftEndTime": "12:00",
          "shiftStartTime": "01:00"
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
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "1"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794425604567"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794673324266"
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
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794459600000"
            }
          },
          "shiftEndTime": "12:00",
          "shiftStartTime": "01:00"
        },
        {
          "_id": {
            "$oid": "6af88872633d649bec85d1f5"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794614400000"
            }
          },
          "shiftName": "ca 3",
          "shift": {
            "$oid": "6af885514e21b1dc3c7decf8"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794672754861"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794676609211"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794672775382"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794675540000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af88877633d649bec85d1f6"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794614400000"
            }
          },
          "shiftName": "ca 3",
          "shift": {
            "$oid": "6af885514e21b1dc3c7decf8"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794672759323"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794676609990"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794672776293"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794675540000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af88881633d649bec85d1f7"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794614400000"
            }
          },
          "shiftName": "ca 3",
          "shift": {
            "$oid": "6af885514e21b1dc3c7decf8"
          },
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794672769706"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794676671477"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794672777438"
            }
          },
          "startingCash": {
            "$numberInt": "0"
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794675540000"
            }
          },
          "endingCashActual": {
            "$numberInt": "0"
          },
          "endingCashSystem": {
            "$numberInt": "0"
          },
          "handoverAt": {
            "$date": {
              "$numberLong": "1794676671476"
            }
          },
          "handoverCashRefunds": {
            "$numberInt": "0"
          },
          "handoverCashSales": {
            "$numberInt": "0"
          },
          "handoverCodReceipts": {
            "$numberInt": "0"
          },
          "handoverNote": "",
          "handoverPaymentCount": {
            "$numberInt": "0"
          },
          "handoverUnattributedCash": {
            "$numberInt": "0"
          },
          "handoverUnattributedCount": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af8a3251dc7407ccb05ea55"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794700800000"
            }
          },
          "shiftName": "ca 1",
          "shift": {
            "$oid": "6af8851f4e21b1dc3c7decf6"
          },
          "shiftStartTime": "00:00",
          "shiftEndTime": "08:00",
          "codPaymentIds": [
            {
              "$oid": "6af8af7edd892966174aa713"
            }
          ],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "Nộp COD 73000",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679589287"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794682879363"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794679626047"
            }
          },
          "endingCashActual": {
            "$numberInt": "73000"
          },
          "endingCashSystem": {
            "$numberInt": "73000"
          },
          "remittanceId": "c68b88d5-9c5e-4596-ad21-75681eb42afb",
          "codReceivedAmount": {
            "$numberInt": "73000"
          },
          "codReceivedAt": {
            "$date": {
              "$numberLong": "1794682879358"
            }
          },
          "codReceivedBy": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "codReceivedNote": "ok da nhan",
          "codReceivingSchedule": {
            "$oid": "6af8a32d1dc7407ccb05ea57"
          }
        },
        {
          "_id": {
            "$oid": "6af8a3291dc7407ccb05ea56"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794700800000"
            }
          },
          "shiftName": "ca 1",
          "shift": {
            "$oid": "6af8851f4e21b1dc3c7decf6"
          },
          "shiftStartTime": "00:00",
          "shiftEndTime": "08:00",
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "PRESENT",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679593900"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794679626910"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794679626910"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8a32d1dc7407ccb05ea57"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794700800000"
            }
          },
          "shiftName": "ca 1",
          "shift": {
            "$oid": "6af8851f4e21b1dc3c7decf6"
          },
          "shiftStartTime": "00:00",
          "shiftEndTime": "08:00",
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "1"
          },
          "status": "COMPLETED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794679597360"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686297239"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "checkInTime": {
            "$date": {
              "$numberLong": "1794679637054"
            }
          },
          "startingCash": {
            "$numberInt": "100000"
          },
          "endingCashActual": {
            "$numberInt": "228000"
          },
          "endingCashSystem": {
            "$numberInt": "228000"
          },
          "handoverAt": {
            "$date": {
              "$numberLong": "1794683810971"
            }
          },
          "handoverCashRefunds": {
            "$numberInt": "0"
          },
          "handoverCashSales": {
            "$numberInt": "55000"
          },
          "handoverCodReceipts": {
            "$numberInt": "73000"
          },
          "handoverNote": "",
          "handoverPaymentCount": {
            "$numberInt": "1"
          },
          "handoverUnattributedCash": {
            "$numberInt": "0"
          },
          "handoverUnattributedCount": {
            "$numberInt": "0"
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794683926374"
            }
          },
          "cashTransferAssignedAt": {
            "$date": {
              "$numberLong": "1794686297238"
            }
          },
          "cashTransferTo": {
            "$oid": "6af8b520968e0a282c86abb1"
          }
        },
        {
          "_id": {
            "$oid": "6af8b520968e0a282c86abb1"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794700800000"
            }
          },
          "shiftName": "ca 2",
          "shift": {
            "$oid": "6af885354e21b1dc3c7decf7"
          },
          "shiftStartTime": "08:01",
          "shiftEndTime": "16:00",
          "codPaymentIds": [],
          "codLedgerVersion": {
            "$numberInt": "0"
          },
          "status": "SCHEDULED",
          "note": "",
          "createdAt": {
            "$date": {
              "$numberLong": "1794684192952"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686259746"
            }
          },
          "__v": {
            "$numberInt": "0"
          },
          "cashTransferDiscrepancy": {
            "sourceSchedule": {
              "$oid": "6af8a32d1dc7407ccb05ea57"
            },
            "expectedCash": {
              "$numberInt": "228000"
            },
            "countedCash": {
              "$numberInt": "227000"
            },
            "note": "thiếu 1k",
            "reportedBy": {
              "$oid": "6af8ad9afcfef0a0c28d486f"
            },
            "reportedAt": {
              "$date": {
                "$numberLong": "1794686259746"
              }
            }
          }
        },
        {
          "_id": {
            "$oid": "6dc0931fbc546764ecc8f656"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794815880000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794843300000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794843000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "6e51fcd05718f4778badf36c"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794873660000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794902400000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794902400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "711b0dfb53dab817835be206"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "71bd4931925388bf25d30c4a"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795247760000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795275180000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795275000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "728afff0e860472d6e5a9bd3"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "749ad6c9d6f86bff9595e208"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795132680000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795161900000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795161600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "7ebc23255acc9a865487395d"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "801aa253c83ac5ce7583c510"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795392060000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795420800000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795420800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "8111166b9018925f17fac49d"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795132800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795132560000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795161780000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795161600000"
            }
          }
        },
        {
          "_id": {
            "$oid": "8331bdf19162cdaf541032ed"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "833fa5e9a2d051c8bac0b2be"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794816120000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794842880000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794843000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "8bc41d060e040f0d80cb49a8"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795478520000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795507080000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795507200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "91208d4a80d932f9dd39cc42"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794873480000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794902700000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794902400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "93085bef4f3b01ba92e36a06"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795219320000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795247880000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795248000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "939c888a586824bed4cc577a"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795305360000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795334580000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795334400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "97267bcff19cfe9dd632f1fc"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795737600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "97d85538fa768692bc1a7708"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795420920000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795447680000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795447800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "9db3faed6c4a32ab8e56434c"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794960060000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794988800000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794988800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "ae1e2eabfd4ab7192f7f28fe"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795305480000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795334700000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795334400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "b8272d5b3dba989f9cdc24aa"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "bd95e7b09adadaf3c55fc8ef"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "c519abb3f495edf976cea8ec"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795219200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795219080000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795248300000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795248000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "c5746700657432303293d356"
          },
          "user": {
            "$oid": "a6592f80e4d4b7e262a58728"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794988560000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795015980000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795015800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "c591f3c6a135c268e7b93720"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795420680000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795448100000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795447800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "c8f3afb39fcd1d3e7967c97d"
          },
          "user": {
            "$oid": "f73d7e8efb7c79dac9640ab6"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "c949a59aec8bd72d16104224"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "cad5e9c3fbe9c72d114e1a53"
          },
          "user": {
            "$oid": "c1905c8e99e73b57b5f96fdc"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795334160000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795361580000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795361400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "cdac07786e2f262dd0e36402"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "ce29ad8bc2d9016bdc76ad0a"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794787080000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794816300000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794816000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "cee6e3f7ffc1b004c8cc0046"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794959880000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794989100000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794988800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "cfc778018de157a754a54c73"
          },
          "user": {
            "$oid": "6af8ad9afcfef0a0c28d486f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794960000000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794988860000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795015800000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795015800000"
            }
          }
        },
        {
          "_id": {
            "$oid": "d23fce458745746d8ade2c4c"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795824000000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "d2e0a7901572bcf0b5c93400"
          },
          "user": {
            "$oid": "7c6941cf77e73924f3089a9c"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795046400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795046520000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795075080000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795075200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "d559fbe01d9c665834f40257"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "d8ef7cbd196882fef5e807e4"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795305600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795334520000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795361280000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795361400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "da96230e0308c68ede64d53d"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab948"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795478280000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795507500000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795507200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "ddb76d88f565f7e69a0ebc01"
          },
          "user": {
            "$oid": "52dd16476071582cd2208939"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794902160000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794929580000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794929400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "e02bc8344cb2c1d6f0fc8c68"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795910400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "e0a8b448f41aa37c76f43eba"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "e47fbed37ea3b8112b81af37"
          },
          "user": {
            "$oid": "ddb1643cf10b2c39c11d7488"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795564800000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "e80d2f17d18e5c49fb4de7cf"
          },
          "user": {
            "$oid": "6af4b8350b44b941144fb48f"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795478400000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1795507260000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1795534200000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1795534200000"
            }
          }
        },
        {
          "_id": {
            "$oid": "ed9bf29563c949380faa49d5"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794873600000"
            }
          },
          "shiftName": "Ca tối",
          "shift": {
            "$oid": "6289798d94cab45fdbee748e"
          },
          "shiftStartTime": "15:00",
          "shiftEndTime": "22:30",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794902460000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794929400000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794929400000"
            }
          }
        },
        {
          "_id": {
            "$oid": "feccf04c4f7c834d6471e2d6"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab944"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "COMPLETED",
          "checkInTime": {
            "$date": {
              "$numberLong": "1794787320000"
            }
          },
          "checkOutTime": {
            "$date": {
              "$numberLong": "1794815880000"
            }
          },
          "note": "Lịch và chấm công mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794816000000"
            }
          }
        },
        {
          "_id": {
            "$oid": "fffcc79031e8bb5a6980678f"
          },
          "user": {
            "$oid": "6aeb673031b031ff6bfab945"
          },
          "workDate": {
            "$date": {
              "$numberLong": "1795651200000"
            }
          },
          "shiftName": "Ca sáng",
          "shift": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "shiftStartTime": "07:00",
          "shiftEndTime": "15:00",
          "status": "SCHEDULED",
          "note": "Lịch phân ca mẫu",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
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
            "$oid": "6289798d94cab45fdbee748e"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca tối",
          "startTime": "15:00",
          "endTime": "22:30",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "6af8851f4e21b1dc3c7decf6"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794182400000"
            }
          },
          "shiftName": "ca 1",
          "startTime": "00:00",
          "endTime": "08:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794671903238"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794671903238"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af885354e21b1dc3c7decf7"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794182400000"
            }
          },
          "shiftName": "ca 2",
          "startTime": "08:01",
          "endTime": "16:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794671925986"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794671925986"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "6af885514e21b1dc3c7decf8"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794182400000"
            }
          },
          "shiftName": "ca 3",
          "startTime": "16:01",
          "endTime": "23:59",
          "createdAt": {
            "$date": {
              "$numberLong": "1794671953056"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794671953056"
            }
          },
          "__v": {
            "$numberInt": "0"
          }
        },
        {
          "_id": {
            "$oid": "86bc4942711693768d2ffadf"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca sáng",
          "startTime": "07:00",
          "endTime": "15:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "c12404a1fdd456d5151ee060"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1795392000000"
            }
          },
          "shiftName": "Ca tối",
          "startTime": "15:00",
          "endTime": "22:30",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          }
        },
        {
          "_id": {
            "$oid": "ee3db81af94f064e1d4967b1"
          },
          "weekStart": {
            "$date": {
              "$numberLong": "1794787200000"
            }
          },
          "shiftName": "Ca sáng",
          "startTime": "07:00",
          "endTime": "15:00",
          "createdAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
          },
          "updatedAt": {
            "$date": {
              "$numberLong": "1794686733611"
            }
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
  const password = process.env.SEED_USER_PASSWORD || '123456';
  // The shared local demo account uses a simple password; normal account policy is unchanged.
  const invalidPassword = password === '123456' ? null : passwordError(password);
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
  console.log('Seed restored. Existing live database passwords were not exported; seeded accounts use SEED_USER_PASSWORD (default: 123456).');
}

async function mergeData() {
  const { mergeSnapshot } = require('./utils/seedMerge');
  const { supplementSnapshot } = require('./utils/seedSupplement');
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp';
  const parsed = new URL(uri);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('Additive seed is restricted to a local development database.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, autoCreate: false, autoIndex: false });
  const result = await mergeSnapshot(mongoose.connection.db, supplementSnapshot(getSnapshot(), {
    staffSchedulesOnly: process.argv.includes('--staff-schedules')
  }), {
    dryRun: process.argv.includes('--dry-run')
  });
  console.log(JSON.stringify({ database: mongoose.connection.name, ...result }, null, 2));
}

if (require.main === module) (process.argv.includes('--export') ? exportSeed() : process.argv.includes('--merge') ? mergeData() : importData()).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { importData, getSnapshot, mergeData };
