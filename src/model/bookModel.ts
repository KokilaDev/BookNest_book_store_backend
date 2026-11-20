import { Document, model, Schema } from 'mongoose';

export interface IBook extends Document {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  coverImage: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  category:
    | 'Fiction'
    | 'Science'
    | 'Technology'
    | 'Business'
    | 'Biography'
    | 'Philosophy';
  badge?:
    | 'Bestseller'
    | 'Staff Pick'
    | 'Collector Edition'
    | 'Award Winner'
    | 'New Release';
  description: string;
  pages: number;
  language: string;
  publishYear: number;
  publisher: string;
  popular?: boolean;
  isbn: string;
  inStock: boolean;
  stock: number;
  excerpt: string;
  formats: {
    format:
      | 'Hardcover'
      | 'Paperback'
      | 'Clothbound Collector';
    price: number;
  }[];
  dimensions: string;
  weight: string;
  newArrival?: boolean;
  tags?: string[];
}

const bookSchema = new Schema<IBook>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    author: { type: String, required: true },
    coverImage: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    category: {
        type: String,
        enum: ['Fiction', 'Science', 'Technology', 'Business', 'Biography', 'Philosophy'],
        required: true
    },
    badge: {
        type: String,
        enum: ['Bestseller', 'Staff Pick', 'Collector Edition', 'Award Winner', 'New Release']
    },
    description: { type: String, required: true },
    pages: { type: Number, required: true },
    language: { type: String, required: true },
    publishYear: { type: Number, required: true },
    publisher: { type: String, required:true },
    popular: { type:Boolean},
    isbn :{type:String,required:true},
    inStock:{type:Boolean,default:true},
    stock:{type:Number,default :0},
    excerpt:{type:String,default:""},
    formats:{
      type:[
        {
          format:String,
          price:Number
        }
      ],
      default:[]
    },
    dimensions:{type:String},
    weight:{type:String},
    newArrival:{type:Boolean},
    tags:[{type:String}]
  },
  { timestamps: true }
);

export const BookModel = model<IBook>('Book', bookSchema);