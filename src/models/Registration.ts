import mongoose, { Document, Schema } from 'mongoose';

export interface IRegistration extends Document {
  nomeCompleto: string;
  dataNascimento: Date;
  endereco: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    cep: string;
  };
  telefone: string;
  email: string;
  nomeResponsavel: string;
  telefoneResponsavel: string;
  serie: string;
  turma: string;
  anoLetivo: number;
  observacoes?: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema: Schema = new Schema({
  nomeCompleto: {
    type: String,
    required: [true, 'Nome completo é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  dataNascimento: {
    type: Date,
    required: [true, 'Data de nascimento é obrigatória']
  },
  endereco: {
    rua: {
      type: String,
      required: [true, 'Rua é obrigatória'],
      trim: true
    },
    numero: {
      type: String,
      required: [true, 'Número é obrigatório'],
      trim: true
    },
    complemento: {
      type: String,
      trim: true
    },
    bairro: {
      type: String,
      required: [true, 'Bairro é obrigatório'],
      trim: true
    },
    cidade: {
      type: String,
      required: [true, 'Cidade é obrigatória'],
      trim: true
    },
    cep: {
      type: String,
      required: [true, 'CEP é obrigatório'],
      trim: true,
      match: [/^\d{5}-?\d{3}$/, 'CEP deve ter formato válido']
    }
  },
  telefone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email deve ter formato válido']
  },
  nomeResponsavel: {
    type: String,
    required: [true, 'Nome do responsável é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome do responsável não pode exceder 100 caracteres']
  },
  telefoneResponsavel: {
    type: String,
    required: [true, 'Telefone do responsável é obrigatório'],
    trim: true
  },
  serie: {
    type: String,
    required: [true, 'Série é obrigatória'],
    trim: true
  },
  turma: {
    type: String,
    required: [true, 'Turma é obrigatória'],
    trim: true
  },
  anoLetivo: {
    type: Number,
    required: [true, 'Ano letivo é obrigatório'],
    min: [2020, 'Ano letivo deve ser maior que 2020'],
    max: [2030, 'Ano letivo deve ser menor que 2030']
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [500, 'Observações não podem exceder 500 caracteres']
  },
  status: {
    type: String,
    enum: ['pendente', 'aprovada', 'rejeitada'],
    default: 'pendente'
  }
}, {
  timestamps: true
});

// Index para busca eficiente
registrationSchema.index({ email: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ anoLetivo: 1, serie: 1 });

export default mongoose.model<IRegistration>('Registration', registrationSchema);