// Função para converter linha do banco para objeto frontend
function convertRowToInscricao(row) {
  return {
    tipoInscricao: row.tipo_inscricao,
    id: row.id,
    email: row.email,
    status: {
      atual: row.ultimo_status || 'Não definido',
      observacao: row.ultimo_status_obs || '',
      dataAtualizacao: row.ultimo_status_data || null
    },
    nomeCompleto: row.nome_completo,
    dataNascimento: row.data_nascimento,
    naturalidade: row.naturalidade,
    sexo: row.sexo,
    endereco: row.endereco,
    batizado: row.batizado,
    paroquiaBatismo: row.paroquia_batismo,
    dioceseBatismo: row.diocese_batismo,
    comunhao: row.comunhao === true ? 'Sim' : (row.comunhao === false ? 'Não' : null),
    paroquiaComunhao: row.paroquia_comunhao,
    dioceseComunhao: row.diocese_comunhao,
    telefoneWhatsApp: row.telefone_whatsapp,
    emailContato: row.email_contato,
    nomePai: row.nome_pai,
    estadoCivilPai: row.estado_civil_pai,
    naturalidadePai: row.naturalidade_pai,
    nomeMae: row.nome_mae,
    estadoCivilMae: row.estado_civil_mae,
    naturalidadeMae: row.naturalidade_mae,
    paisCasadosIgreja: row.pais_casados_igreja,
    paroquiaCasamentoPais: row.paroquia_casamento_pais,
    dioceseCasamentoPais: row.diocese_casamento_pais,
    nomePadrinhoMadrinha: row.nome_padrinho_madrinha,
    padrinhoCrismado: row.padrinho_crismado,
    dataInicioCurso: row.data_inicio_curso,
    comunidadeCurso: row.comunidade_curso,
    nomeCatequista: row.nome_catequista,
    horarioCurso: row.horario_curso,
    // Metadados dos arquivos BLOB
    documentoIdentidadeNome: row.documento_identidade_nome,
    documentoIdentidadeTipo: row.documento_identidade_tipo,
    documentoIdentidadeTamanho: row.documento_identidade_tamanho,
    certidaoBatismoNome: row.certidao_batismo_nome,
    certidaoBatismoTipo: row.certidao_batismo_tipo,
    certidaoBatismoTamanho: row.certidao_batismo_tamanho,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  convertRowToInscricao
};