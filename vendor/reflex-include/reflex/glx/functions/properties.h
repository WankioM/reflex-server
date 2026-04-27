#pragma once

#include "../defines.h"




//
//Primary API

namespace Reflex::GLX
{

	void UnsetPointProperty(Data::PropertySet & object, Key32 property_id);

	void SetPointProperty(Data::PropertySet & object, Key32 property_id, Point value);

	ConstTRef <PointProperty> GetPointProperty(const Data::PropertySet & object, Key32 property_id);

	Point GetPointValue(const Data::PropertySet & object, Key32 property_id, Point fallback = {});


	void UnsetSizeProperty(Data::PropertySet & object, Key32 property_id);

	void SetSizeProperty(Data::PropertySet & object, Key32 property_id, Size value);

	ConstTRef <SizeProperty> GetSizeProperty(const Data::PropertySet & object, Key32 property_id);

	Size GetSizeValue(const Data::PropertySet & object, Key32 property_id, Size fallback = {});


	void UnsetMarginProperty(Data::PropertySet & object, Key32 property_id);

	void SetMarginProperty(Data::PropertySet & object, Key32 property_id, const Margin & value);

	ConstTRef <MarginProperty> GetMarginProperty(const Data::PropertySet & object, Key32 property_id);


	void UnsetColourProperty(Data::PropertySet & object, Key32 property_id);

	void SetColourProperty(Data::PropertySet & object, Key32 property_id, const Colour & value);

	ConstTRef <ColourProperty> GetColourProperty(const Data::PropertySet & object, Key32 property_id);

	const Colour & GetColourValue(const Data::PropertySet & object, Key32 property_id, const Colour & fallback = kWhite);


	void UnsetColorProperty(Data::PropertySet & object, Key32 property_id);

	void SetColorProperty(Data::PropertySet & object, Key32 property_id, const Colour & value);

	ConstTRef <ColourProperty> GetColorProperty(const Data::PropertySet & object, Key32 property_id);

	const Colour & GetColorValue(const Data::PropertySet & object, Key32 property_id, const Colour & fallback = kWhite);

}




//
//impl

inline void Reflex::GLX::UnsetColorProperty(Data::PropertySet & object, Key32 property_id)
{
	UnsetColourProperty(object, property_id);
}

inline void Reflex::GLX::SetColorProperty(Data::PropertySet & object, Key32 property_id, const Colour & value)
{
	SetColourProperty(object, property_id, value);
}

inline Reflex::ConstTRef <Reflex::GLX::ColourProperty> Reflex::GLX::GetColorProperty(const Data::PropertySet & object, Key32 property_id)
{
	return GetColourProperty(object, property_id);
}

inline const Reflex::GLX::Colour & Reflex::GLX::GetColorValue(const Data::PropertySet & object, Key32 property_id, const Colour & fallback)
{
	return GetColourValue(object, property_id, fallback);
}
