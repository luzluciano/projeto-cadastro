import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Registration, { IRegistration } from '../models/Registration';

// @desc    Create new registration
// @route   POST /api/registrations
// @access  Public
export const createRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: errors.array()
      });
      return;
    }

    const registration = await Registration.create(req.body);

    res.status(201).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations
// @route   GET /api/registrations
// @access  Private
export const getRegistrations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, serie, anoLetivo, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (serie) filter.serie = serie;
    if (anoLetivo) filter.anoLetivo = parseInt(anoLetivo as string);

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Registration.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: registrations.length,
      total,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Private
export const getRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      res.status(404).json({
        success: false,
        error: 'Inscrição não encontrada'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update registration
// @route   PUT /api/registrations/:id
// @access  Private
export const updateRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!registration) {
      res.status(404).json({
        success: false,
        error: 'Inscrição não encontrada'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private
export const deleteRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);

    if (!registration) {
      res.status(404).json({
        success: false,
        error: 'Inscrição não encontrada'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update registration status
// @route   PATCH /api/registrations/:id/status
// @access  Private
export const updateRegistrationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;

    if (!['pendente', 'aprovada', 'rejeitada'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status inválido'
      });
      return;
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!registration) {
      res.status(404).json({
        success: false,
        error: 'Inscrição não encontrada'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};