#pragma once

#include "style.h"




//
//Primary API

namespace Reflex::GLX
{

	class StyleSheet;

}




//
//StyleSheet

class Reflex::GLX::StyleSheet : public Style
{
public:

	REFLEX_OBJECT(GLX::StyleSheet,Style);

	static StyleSheet & null;



	//lifetime

	StyleSheet(Key32 id, Float32 scale = 1.0f);



	//overrides

	virtual const Style * QuerySubStyle(Key32 key, const Style * fallback) const override;



	//includes

	const Array < ConstReference <StyleSheet> > & GetIncludes() const;


	
	//info

	const Key32 path;

	const Float kScale;



protected:

	virtual void OnSetProperty(Address address, Reflex::Object & object) override;


	Array < ConstReference <StyleSheet> > m_includes;

};

template <> struct Reflex::SubIndexType <Reflex::GLX::StyleSheet> { using Type = Key32; };

REFLEX_SET_TRAIT(Reflex::GLX::StyleSheet, IsSingleThreadExclusive)




//
//impl

REFLEX_INLINE const Reflex::Array < Reflex::ConstReference <Reflex::GLX::StyleSheet> > & Reflex::GLX::StyleSheet::GetIncludes() const
{
	return m_includes;
}
