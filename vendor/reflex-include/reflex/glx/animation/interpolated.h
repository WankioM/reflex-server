#pragma once

#include "animation.h"




//
//Secondary API (Primary: CreateXXXAnimation)

namespace Reflex::GLX
{

	enum Curve : UInt8
	{
		kCurveLinear,

		kCurveEaseIn2x,
		kCurveEaseIn3x,

		kCurveEaseOut2x,
		kCurveEaseOut3x,

		kCurveEaseInOutCos,
		kCurveEaseInOut2x,

		kNumCurve,
	};

	Curve GetCurve(Key32 id, Curve default_idx = kCurveLinear);


	class InterpolatedAnimation;

}




//
//InterpolatedAnimation

class Reflex::GLX::InterpolatedAnimation : public Animation
{
public:

	REFLEX_OBJECT(GLX::InterpolatedAnimation, Animation);

	static InterpolatedAnimation & null;



	//lifetime
	
	using Animation::Animation;



	//setup

	void SetCurve(Curve curve) { OnSetCurve(curve); }

	void Flip() { OnFlip(); }


	
protected:

	//callbacks

	virtual void OnSetCurve(Curve curve) = 0;

	virtual void OnFlip() = 0;

};

REFLEX_SET_TRAIT(Reflex::GLX::InterpolatedAnimation, IsSingleThreadExclusive)




//
//impl

REFLEX_NS(Reflex::GLX::Detail)

using CurveFn = FunctionPointer <Float(Float)>;

extern const Pair <Key32, CurveFn> kCurves[kNumCurve];

REFLEX_END
